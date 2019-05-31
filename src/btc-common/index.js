const fetch = require("node-fetch");

async function getUnspents(address, network) {
  const net = network === "mainnet" ? "main" : "test3";

  const url = `https://api.blockcypher.com/v1/btc/${net}/addrs/${address}?unspentOnly=true&confirmations=1&limit=800`;
  const res = await fetch(url);
  const response = await res.json();
  if (response.error) {
    console.error(`api error: ${response.error}`);
    throw new Error(response.error);
  }
  return (response.txrefs || []).map(utxo => ({
    txid: utxo.tx_hash,
    vout: utxo.tx_output_n,
    amount: utxo.value
  }));
}

function pickUtxos(utxos, outSum) {
  let result = [];
  let inSum = 0;
  for (let utxo of utxos) {
    result.push(utxo);
    inSum += utxo.amount;
    if (inSum >= outSum) {
      break;
    }
  }

  if (inSum < outSum) {
    throw new Error("UTXO 不足以支付提现");
    process.exit(1);
  }

  return result;
}

module.exports = {
  getUnspents,
  pickUtxos
};
