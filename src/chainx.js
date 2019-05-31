require("dotenv").config();

if (!process.env.chainx_ws_addr) {
  console.error("没有设置chainx_ws_addr");
  process.exit(1);
}

const ChainX = require("chainx.js").default;
const { WsProvider } = require("chainx.js");
const provider = new WsProvider("ws://192.168.1.130:8087", false);
provider.connect();
module.exports = new ChainX(provider);
