/**
 * 此脚本用于构造比特币提现交易原文
 */

const chainx = require("./chainx");

async function getLimit() {
  await chainx.isRpcReady();

  const limit = await chainx.asset.getWithdrawalLimitByToken("BTC");

  console.log(limit);
}

getLimit();
