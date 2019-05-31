async function getIntentions(chainx) {
  const intentions = await chainx.stake.getIntentions();
  return intentions;
}

async function getBTCWithdrawalList(chainx) {
  const withdrawalList = await chainx.asset.getWithdrawalList(
    "Bitcoin",
    0,
    100 // 适当增大以显示全部提现
  );

  return withdrawalList;
}

async function getWithdrawLimit(chainx) {
  const limit = await chainx.asset.getWithdrawalLimitByToken("BTC");
  return limit;
}

module.exports = {
  getIntentions,
  getBTCWithdrawalList,
  getWithdrawLimit
};
