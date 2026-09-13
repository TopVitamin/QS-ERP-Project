export function hasNegativePrice(lines = []) {
  return lines.some((line) => Number(line.price) < 0);
}
