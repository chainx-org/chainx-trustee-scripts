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

module.exports = {
  getIntentions,
  getBTCWithdrawalList
};
