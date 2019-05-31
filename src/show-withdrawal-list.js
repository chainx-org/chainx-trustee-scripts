/**
 * 此脚本显示目前链上提现列表
 */

const chainx = require("./chainx");
require("console.table");
const { getBTCWithdrawalList } = require("./chainx-common");

async function init() {
  await chainx.isRpcReady();
}

async function showWithdrawLimit() {
  const limit = await chainx.asset.getWithdrawalLimitByToken("BTC");

  console.log("提现设置:\n");
  console.table([limit]);
}

async function showWithdrawalList() {
  const withdrawalList = await getBTCWithdrawalList(chainx);

  const normalizedList = withdrawalList.data.map(withdrawal => {
    const chainxAddress = chainx.account.encodeAddress(withdrawal.accountid);
    const btcAddress = withdrawal.address;
    const balance = withdrawal.balance / Math.pow(10, 8);
    const status = (withdrawal.status || {}).value;

    return {
      id: withdrawal.id,
      ["balance(BTC)"]: balance,
      "BTC address": btcAddress,
      "ChainX address": chainxAddress,
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
  try {
    await init();
    await showWithdrawLimit();
    await showWithdrawalList();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
