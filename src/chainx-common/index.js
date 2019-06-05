async function getIntentions(chainx) {
  const intentions = await chainx.stake.getIntentions();
  return intentions;
}

async function getBTCWithdrawalList(chainx) {
  // TODO: 处理分页问题
  const withdrawalList = await chainx.asset.getWithdrawalList(
    "Bitcoin",
    0,
    100 // 适当增大以显示全部提现
  );

  return withdrawalList.data;
}

async function getWithdrawLimit(chainx) {
  const limit = await chainx.asset.getWithdrawalLimitByToken("BTC");
  return limit;
}

async function getTrusteeInfo(chainx) {
  const info = await chainx.trustee.getTrusteeSessionInfo("Bitcoin");
  const { addr, redeemScript } = info.hotEntity;
  const { addr: coldAddr } = info.coldEntity;
  const { required, total } = info.counts;

  return info;
}

module.exports = {
  getIntentions,
  getBTCWithdrawalList,
  getWithdrawLimit,
  getTrusteeInfo
};
