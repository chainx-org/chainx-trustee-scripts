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

async function calcTargetUnspents(utxos, amount, feeRate, required, total) {
  let outSum = amount;
  let targetInputs = pickUtxos(utxos, amount);
  let inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);
  let outputLength = 1;
  let bytes =
    targetInputs.length * (48 + 73 * required + 34 * total) +
    34 * (outputLength + 1) +
    14;

  let minerFee = parseInt(
    (Number(process.env.bitcoin_fee_rate) * bytes) / 1000
  );

  while (inputSum < outSum + minerFee) {
    targetInputs = pickUtxos(utxos, outSum + minerFee);
    inputSum = targetInputs.reduce((sum, input) => sum + input.amount, 0);
    bytes =
      targetInputs.length * (48 + 73 * required + 34 * total) +
      34 * (outputLength + 1) +
      14;
    minerFee = (Number(process.env.bitcoin_fee_rate) * bytes) / 1000;
  }

  return [targetInputs, minerFee];
}

module.exports = {
  getUnspents,
  pickUtxos,
  calcTargetUnspents
};
