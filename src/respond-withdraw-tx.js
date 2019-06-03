require("dotenv").config();
const { remove0x } = require("./utils");
const bitcoin = require("bitcoinjs-lib");

const chainx = require("./chainx");

let redeemScript;

async function init() {
  await chainx.isRpcReady();

  if (!process.env.redeemScript) {
    console.error("没有设置redeemScript");
    process.exit(1);
  }
  redeemScript = Buffer.from(remove0x(process.env.redeemScript), "hex");

  if (!process.env.bitcoin_private_key) {
    console.error("没有设置bitcoin_private_key");
    process.exit(1);
  }
}

async function respond() {
  const withdrawalTx = await chainx.trustee.getWithdrawTx("Bitcoin");

  if (!withdrawalTx) {
    console.log("目前链上无代签原文");
  }

  await sign(withdrawalTx.tx);
}

async function sign(rawTx) {
  const properties = await chainx.chain.chainProperties();
  const network =
    properties["bitcoin_type"] === "mainnet"
      ? bitcoin.networks.bitcoin
      : bitcoin.networks.testnet;

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

  const signedRawTx = txb.__TX.toHex();
  console.log("签名后原文:");
  console.log(signedRawTx);
}

(async function() {
  try {
    await init();
    await respond();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
