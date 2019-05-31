async function getIntentions(chainx) {
  const intentions = await chainx.stake.getIntentions();
  return intentions;
}

module.exports = {
  getIntentions
};
