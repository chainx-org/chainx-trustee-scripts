/**
 * 此脚本用于构造比特币提现交易原文
 */

require("dotenv").config();
require("console.table");
const chainx = require("./chainx");
const { getWithdrawLimit, getBTCWithdrawalList } = require("./chainx-common");
const { getUnspents, pickUtxos } = require("./btc-common");
const bitcoin = require("bitcoinjs-lib");

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
  filteredList = leaveOnelyApplying(list);

  if (filteredList <= 0) {
    console.log("暂无合法体现");
  }

  await composeBtcTx(filteredList, limit.fee);

  chainx.provider.websocket.close();
  process.exit(0);
}

async function composeBtcTx(withdrawals, fee) {
  const info = await chainx.trustee.getTrusteeSessionInfo("Bitcoin");
  const properties = await chainx.chain.chainProperties();
  const { addr } = info.hotEntity;
  const { required, total } = info.counts;

  const unspents = await getUnspents(addr, properties["bitcoin_type"]);
  unspents.sort((a, b) => a.amount > b.amount);

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

  const rawTx = txb.__TX.toHex();
  console.log("生成代签原文:");
  console.log(rawTx);
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
