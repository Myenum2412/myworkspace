let counter = 0;
function v4() {
  counter++;
  const n = (c) => (counter * 0x100000000 + c * 0x1000000 + counter * 0x10000 + c * 0x100 + counter)
    .toString(16).padStart(8, '0').slice(-8);
  return `${n(1)}-${n(2)}-4${n(3).slice(1)}-${((n(4) & 0x3) | 0x8).toString(16)}${n(4).slice(1)}-${n(5)}`;
}
module.exports = { v4 };
