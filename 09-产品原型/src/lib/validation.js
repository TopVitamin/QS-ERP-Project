export function hasNegativePrice(lines = []) {
  return lines.some((line) => Number(line.price) < 0);
}

export function isValidTaxRate(value) {
  const text = String(value ?? '').trim();
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return false;
  return Number.isFinite(Number(text)) && Number(text) >= 0;
}

export function hasInvalidTaxRate(lines = []) {
  return lines.some((line) => line.taxRate !== '' && line.taxRate != null && !isValidTaxRate(line.taxRate));
}
