const chainx = require("./chainx");
require("console.table");

async function showWithdrawalTx() {
  await chainx.isRpcReady();

  const withdrawalTx = await chainx.trustee.getWithdrawTx("Bitcoin");

  if (!withdrawalTx) {
    console.log("目前链上无代签原文");
  } else {
    console.log("代签原文: \n", withdrawalTx.tx);

    if (withdrawalTx.trusteeList.length <= 0) {
      console.log("目前没有信托签名");
    } else {
      console.log("已签信托列表:\n");
      for (let trustee of withdrawalTx.trusteeList) {
        console.log(chainx.account.encodeAddress(trustee));
      }

      if (withdrawalTx.signStatus) {
        console.log("签名已完成");
      }

      if (withdrawalTx.redeemScript) {
        console.log("赎回脚本: \n");
        console.log(withdrawalTx.redeemScript);
      }
    }
  }

  chainx.provider.websocket.close();
  process.exit(0);
}

showWithdrawalTx();
