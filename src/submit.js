require("dotenv").config();
const chainx = require("./chainx");
const { addOx } = require("./utils");

const rawTx = process.argv[2];
if (!rawTx) {
  throw new Error("没有指定待签交易原文");
  process.exit(1);
}

async function init() {
  await chainx.isRpcReady();

  if (!process.env.chainx_private_key) {
    console.error("没有设置chainx_private_key");
    process.exit(1);
  }
}

async function submit() {
  console.log("\n开始构造并提交ChainX信托交易...");

  const extrinsic = await chainx.trustee.signWithdrawTx(addOx(rawTx));
  extrinsic.signAndSend(
    process.env.chainx_private_key,
    { acceleration: 1 },
    (error, result) => {
      if (error) {
        console.error("签名且发送交易失败：");
        console.error(error);
      }

      if (result) {
        console.log("交易状态：", result.status);

        if (result.status === "Finalized") {
          console.log("交易执行结果：", result.result);
          chainx.provider.websocket.close();
          process.exit(0);
        }
      }
    }
  );
}

(async function() {
  try {
    await init();
    await submit();

    chainx.provider.websocket.close();
  } catch (e) {
    console.error(e);
    chainx.provider.websocket.close();
    process.exit(1);
  }
})();
