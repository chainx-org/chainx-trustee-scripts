/**
 * 此脚本用于构造热转冷交易
 */

require("dotenv").config();
require("console.table");
const chainx = require("./chainx");
const { getUnspents, pickUtxos } = require("./btc-common");
const bitcoin = require("bitcoinjs-lib");
const { remove0x } = require("./utils");

let amount;

const rawAmount = process.argv[2];
if (!rawAmount) {
  throw new Error("没有指定转账金额");
  process.exit(1);
}

amount = Math.pow(10, 8) * parseFloat(rawAmount);

async function init() {
  if (!process.env.bitcoin_fee_rate) {
    throw new Error("bitcoin_fee_rate 没有设置");
    process.exit(1);
  }

  if (!process.env.min_change) {
    throw new Error("min_change 没有设置");
    process.exit(1);
  }

  if (!process.env.bitcoin_private_key) {
    throw new Error("bitcoin_private_key 没有设置");
    process.exit(1);
  }

  await chainx.isRpcReady();
}

async function construct() {
  const info = await chainx.trustee.getTrusteeSessionInfo("Bitcoin");
  const properties = await chainx.chain.chainProperties();
  const { addr, redeemScript } = info.hotEntity;
  const { addr: coldAddr } = info.coldEntity;
  const { required, total } = info.counts;

  const unspents = await getUnspents(addr, properties["bitcoin_type"]);
  unspents.sort((a, b) => a.amount > b.amount);

  let outSum = amount;
  let targetInputs = pickUtxos(unspents, amount);
  let inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);
  let outputLength = 1;
  let bytes =
    targetInputs.length * (48 + 73 * required + 34 * total) +
    34 * (outputLength + 1) +
    14;

  let minerFee = parseInt(
    (Number(process.env.bitcoin_fee_rate) * bytes) / 1000
  );

  while (inputSum < outSum + minerFee) {
    targetInputs = pickUtxos(unspents, outSum + minerFee);
    bytes =
      targetInputs.length * (48 + 73 * required + 34 * total) +
      34 * (outputLength + 1) +
      14;
    minerFee = (Number(process.env.bitcoin_fee_rate) * bytes) / 1000;
  }

  let change = inputSum - outSum - minerFee;
  if (change < Number(process.env.min_change)) {
    change = 0;
  }

  logMinerFee(minerFee);

  const network =
    properties["bitcoin_type"] === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;
  const txb = new bitcoin.TransactionBuilder(network);
  txb.setVersion(1);

  for (const unspent of targetInputs) {
    txb.addInput(unspent.txid, unspent.vout);
  }

  txb.addOutput(coldAddr, amount);
  if (change > 0) {
    txb.addOutput(addr, change);
  }

  const keyPair = bitcoin.ECPair.fromWIF(
    process.env.bitcoin_private_key,
    network
  );

  let redeem = Buffer.from(remove0x(redeemScript), "hex");
  for (let i = 0; i < txb.__inputs.length; i++) {
    txb.sign(i, keyPair, redeem);
  }

  logInputs(targetInputs);
  logOutputs(txb, network);

  const rawTx = txb.build().toHex();
  console.log("生成代签原文:");
  console.log(rawTx);
}

function logMinerFee(minerFee) {
  console.log("所花手续费:");
  console.log(minerFee / Math.pow(10, 8) + " BTC\n");
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

function logOutputs(txb, network) {
  console.log("提现列表:");
  const normalizedOuts = txb.__tx.outs.map(out => {
    const address = bitcoin.address.fromOutputScript(out.script, network);
    const value = out.value / Math.pow(10, 8);
    return { address, ["value(BTC)"]: value };
  });

  console.table(normalizedOuts);
}

(async function() {
  try {
    await init();
    await construct();

    chainx.provider.websocket.close();
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
