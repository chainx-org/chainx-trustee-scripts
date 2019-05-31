const ChainX = require("chainx.js").default;
const { WsProvider } = require("chainx.js");
const provider = new WsProvider("wss://w1.chainx.org/ws", false);
provider.connect();
module.exports = new ChainX(provider);
