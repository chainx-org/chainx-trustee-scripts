function remove0x(str) {
  if (str.startsWith("0x")) {
    return str.slice(2);
  } else {
    return str;
  }
}

module.exports = {
  remove0x
};
