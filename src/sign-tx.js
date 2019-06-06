require("dotenv").config();
require("console.table");
const bitcoin = require("bitcoinjs-lib");
const { remove0x } = require("./utils");

const network = bitcoin.networks.bitcoin;

const rawTx = process.argv[2];
if (!rawTx) {
  throw new Error("没有指定待签交易原文");
  process.exit(1);
}

let redeemScript;

function init() {
  if (!process.env.bitcoin_private_key) {
    throw new Error("bitcoin_private_key 没有设置");
    process.exit(1);
  }

  if (!process.env.redeem_script) {
    throw new Error("redeem_script 没有设置");
    process.exit(1);
  }

  redeemScript = Buffer.from(remove0x(process.env.redeem_script), "hex");
}

function sign() {
  const tx = bitcoin.Transaction.fromHex(remove0x(rawTx));
  const txb = bitcoin.TransactionBuilder.fromTransaction(tx, network);

  const keyPair = bitcoin.ECPair.fromWIF(
    process.env.bitcoin_private_key,
    network
  );

  try {
    for (let i = 0; i < tx.ins.length; i++) {
      txb.sign(i, keyPair, redeemScript);
    }
  } catch (e) {
    console.error("签名出错：", e);
    process.exit(1);
  }

  const signedRawTx = txb.build().toHex();
  console.log("签名后原文:");
  console.log(signedRawTx);
}

(async function() {
  try {
    init();
    sign();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
