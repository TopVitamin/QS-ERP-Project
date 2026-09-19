/** 页面空值占位符：英文连字符，不用中文破折号 */
export const EMPTY_PLACEHOLDER = '-';

export function formatEmpty(value, fallback = EMPTY_PLACEHOLDER) {
  if (value === undefined || value === null || value === '') return fallback;
  return value;
}

export function formatAmount(value) {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calculateNetUnitPrice(line) {
  const price = Number(line.price || 0);
  const rate = Number(line.taxRate || 0);
  if (!rate) return price;
  return price / (1 + rate / 100);
}

/** 行价税合计（含税金额） */
export function calculateGrossAmount(line) {
  return Number(line.quantity || 0) * Number(line.price || 0);
}

/** @deprecated 使用 calculateGrossAmount */
export function calculateLineAmount(line) {
  return calculateGrossAmount(line);
}

/** 行不含税金额 */
export function calculateNetAmount(line) {
  return Number(line.quantity || 0) * calculateNetUnitPrice(line);
}

/** 行税额 */
export function calculateTaxAmount(line) {
  return calculateGrossAmount(line) - calculateNetAmount(line);
}

export function computeLineTaxMetrics(line) {
  const netUnit = calculateNetUnitPrice(line);
  const grossAmount = calculateGrossAmount(line);
  const netAmount = calculateNetAmount(line);
  const taxAmount = grossAmount - netAmount;
  return { netUnit, grossAmount, netAmount, taxAmount };
}

export function computeLinesTotals(lines = []) {
  return lines.reduce((acc, line) => {
    const metrics = computeLineTaxMetrics(line);
    return {
      quantity: acc.quantity + Number(line.quantity || 0),
      grossAmount: acc.grossAmount + metrics.grossAmount,
      netAmount: acc.netAmount + metrics.netAmount,
      taxAmount: acc.taxAmount + metrics.taxAmount,
    };
  }, { quantity: 0, grossAmount: 0, netAmount: 0, taxAmount: 0 });
}

export function productLabel(value, options = []) {
  return options.find((option) => option.value === value)?.label || value || EMPTY_PLACEHOLDER;
}

export function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
