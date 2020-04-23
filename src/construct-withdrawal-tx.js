/**
 * 此脚本用于构造比特币提现交易原文
 */

require("dotenv").config();
require("console.table");
const chainx = require("./chainx");
const { getWithdrawLimit, getBTCWithdrawalList } = require("./chainx-common");
const { getUnspents, pickUtxos } = require("./btc-common");
const bitcoin = require("bitcoinjs-lib");
const { remove0x, addOx } = require("./utils");

const args = process.argv.slice(2);
const needSign = args.find(arg => arg === "--sign");
const needSubmit = args.find(arg => arg === "--submit");

async function init() {
  if (!process.env.bitcoin_fee_rate) {
    throw new Error("bitcoin_fee_rate 没有设置");
    process.exit(1);
  }

  if (!process.env.min_change) {
    throw new Error("min_change 没有设置");
    process.exit(1);
  }

  await chainx.isRpcReady();
}

function filterSmallWithdraw(list, minimal) {
  return list.filter(withdrawal => withdrawal.balance >= minimal);
}

function leaveOnelyApplying(list) {
  return list.filter(withdrawal => withdrawal.status.value === "Applying");
}

async function construct() {
  const list = await getBTCWithdrawalList(chainx);
  const limit = await getWithdrawLimit(chainx);

  let filteredList = filterSmallWithdraw(list, limit.minimalWithdrawal);
  filteredList = leaveOnelyApplying(filteredList);

  if (filteredList <= 0) {
    console.log("暂无合法体现");
    process.exit(0);
  }

  await composeBtcTx(filteredList, limit.fee);

  if (!needSubmit) {
    chainx.provider.websocket.close();
    process.exit(0);
  }
}

async function composeBtcTx(withdrawals, fee) {
  const info = await chainx.trustee.getTrusteeSessionInfo("Bitcoin");
  const properties = await chainx.chain.chainProperties();
  const { addr } = info.hotEntity;
  const { required, total } = info.counts;

  const unspents = await getUnspents(addr, properties["bitcoin_type"]);
  unspents.sort((a, b) => Number(b.amount) - Number(a.amount));

  let outSum = withdrawals.reduce(
    (result, withdraw) => result + withdraw.balance - fee,
    0
  );
  let targetInputs = pickUtxos(unspents, outSum);
  let inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);
  let bytes =
    targetInputs.length * (48 + 73 * required + 34 * total) +
    34 * (withdrawals.length + 1) +
    14;
  let minerFee = parseInt(
    (Number(process.env.bitcoin_fee_rate) * bytes) / 1000
  );

  while (inputSum < outSum + minerFee) {
    targetInputs = pickUtxos(unspents, outSum + minerFee);
    bytes =
      targetInputs.length * (48 + 73 * required + 34 * total) +
      34 * (withdrawals.length + 1) +
      14;
    minerFee = (Number(process.env.bitcoin_fee_rate) * bytes) / 1000;
  }
  let change = inputSum - outSum - minerFee;
  if (change < Number(process.env.min_change)) {
    change = 0;
  }

  logMinerFee(minerFee);
  logInputs(targetInputs);
  logOutputs(withdrawals);

  const network =
    properties["bitcoin_type"] === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
  const txb = new bitcoin.TransactionBuilder(network);
  txb.setVersion(1);

  for (const unspent of targetInputs) {
    txb.addInput(unspent.txid, unspent.vout);
  }

  for (const withdrawal of withdrawals) {
    txb.addOutput(withdrawal.address, withdrawal.balance);
  }
  if (change > 0) {
    txb.addOutput(addr, change);
  }

  const signed = await signIfRequired(txb, network);
  let rawTx;
  if (signed) {
    rawTx = txb.build().toHex();
  } else {
    rawTx = txb.buildIncomplete().toHex();
  }
  console.log("生成代签原文:");
  console.log(rawTx);

  await submitIfRequired(withdrawals, rawTx);
}

async function signIfRequired(txb, network) {
  if (!needSign) {
    return false;
  }

  if (!process.env.bitcoin_private_key) {
    console.error("没有设置bitcoin_private_key");
    process.exit(1);
  }

  const info = await chainx.trustee.getTrusteeSessionInfo("Bitcoin");
  const redeemScript = Buffer.from(
    remove0x(info.hotEntity.redeemScript),
    "hex"
  );

  const keyPair = bitcoin.ECPair.fromWIF(
    process.env.bitcoin_private_key,
    network
  );
  for (let i = 0; i < txb.__inputs.length; i++) {
    txb.sign(i, keyPair, redeemScript);
  }

  return true;
}

async function submitIfRequired(withdrawals, rawTx) {
  if (!needSubmit) {
    return;
  }

  console.log("\n开始构造并提交ChainX信托交易...");

  if (!process.env.chainx_private_key) {
    console.error("没有设置chainx_private_key");
    process.exit(1);
  }

  const ids = withdrawals.map(withdrawal => withdrawal.id);
  const extrinsic = await chainx.trustee.createWithdrawTx(ids, addOx(rawTx));
  extrinsic.signAndSend(
    process.env.chainx_private_key,
    { acceleration: 1 },
    (error, result) => {
      if (error) {
        console.error("签名且发送交易失败：");
        console.error(error);
      }

      if (result) {
        console.log("交易状态：", result.status);

        if (result.status === "Finalized") {
          console.log("交易执行结果：", result.result);
          chainx.provider.websocket.close();
          process.exit(0);
        }
      }
    }
  );
}

function logMinerFee(minerFee) {
  console.log("所花手续费:");
  console.log(minerFee / Math.pow(10, 8) + " BTC");
}

function logInputs(inputs) {
  console.log("所花UTXO列表:");
  console.table(
    inputs.map(input => ({
      ...input,
      amount: input.amount / Math.pow(10, 8) + " BTC"
    }))
  );
}

function logOutputs(outputs) {
  console.log("提现列表:");
  console.table(
    outputs.map(out => ({
      address: out.address,
      balance: out.balance / Math.pow(10, 8) + " BTC"
    }))
  );
}

(async function() {
  try {
    await init();
    await construct();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
