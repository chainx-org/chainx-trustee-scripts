function remove0x(str) {
  if (str.startsWith("0x")) {
    return str.slice(2);
  } else {
    return str;
  }
}

function addOx(str) {
  if (str.startsWith("0x")) {
    return str;
  } else {
    return "0x" + str;
  }
}

module.exports = {
  remove0x,
  addOx
};
