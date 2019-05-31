const chainx = require("./chainx");
require("console.table");

async function init() {
  await chainx.isRpcReady();
}

async function showWithdrawLimit() {
  const limit = await chainx.asset.getWithdrawalLimitByToken("BTC");

  console.log("提现设置:\n");
  console.table([limit]);
}

async function showWithdrawalList() {
  const withdrawalList = await chainx.asset.getWithdrawalList(
    "Bitcoin",
    0,
    100 // 适当增大以显示全部提现
  );

  const normalizedList = withdrawalList.data.map(withdrawal => {
    const address = chainx.account.encodeAddress(withdrawal.accountid);
    const balance = withdrawal.balance / Math.pow(10, 8);
    const status = (withdrawal.status || {}).value;
    return {
      id: withdrawal.id,
      ["balance(BTC)"]: balance,
      address,
      status,
      memo: withdrawal.memo,
      txid: withdrawal.txid
    };
  });

  console.log("提现列表: \n");
  console.table(normalizedList);

  chainx.provider.websocket.close();
  process.exit(0);
}

(async function() {
  await init();
  await showWithdrawLimit();
  await showWithdrawalList();
})();
