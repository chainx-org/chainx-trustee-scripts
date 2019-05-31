const chainx = require("./chainx");
require("console.table");
const bitcoin = require("bitcoinjs-lib");
const { remove0x } = require("./utils");
const { getIntentions } = require("./chainx-common");

const network =
  process.env.network === "mainnet"
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;

async function init() {
  await chainx.isRpcReady();
}

async function showWithdrawalTx() {
  const withdrawalTx = await chainx.trustee.getWithdrawTx("Bitcoin");

  if (!withdrawalTx) {
    console.log("目前链上无代签原文");
  } else {
    console.log("代签原文: \n", withdrawalTx.tx);
    await parseRawTxAndLog(withdrawalTx.tx);

    if (withdrawalTx.trusteeList.length <= 0) {
      console.log("目前没有信托签名");
    } else {
      await logSignedIntentions(withdrawalTx.trusteeList);

      if (withdrawalTx.signStatus) {
        console.log("签名已完成");
      }

      if (withdrawalTx.redeemScript) {
        console.log("\n赎回脚本: \n");
        console.log(withdrawalTx.redeemScript);
      }
    }
  }

  chainx.provider.websocket.close();
  process.exit(0);
}

async function parseRawTxAndLog(rawTx) {
  const tx = bitcoin.Transaction.fromHex(remove0x(rawTx));

  const normalizedOuts = tx.outs.map(out => {
    const address = bitcoin.address.fromOutputScript(out.script, network);
    const value = out.value / Math.pow(10, 8);
    return { address, ["value(BTC)"]: value };
  });

  // TODO: 输出inputs列表，需查询比特币网络

  console.log("\nOutputs 列表:");
  console.table(normalizedOuts);
}

async function logSignedIntentions(trusteeList) {
  const intentions = await getIntentions(chainx);

  console.log("已签信托列表:\n");
  for (let trustee of trusteeList) {
    const [accountId, signed] = trustee;
    if (signed) {
      const targetIntention = intentions.find(
        intention => intention.account === accountId
      );
      console.log(
        chainx.account.encodeAddress(accountId),
        targetIntention.name
      );
    }
  }
}

(async function() {
  try {
    await init();
    await showWithdrawalTx();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
