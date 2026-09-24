/** 页面空值占位符：英文连字符，不用中文破折号 */
export const EMPTY_PLACEHOLDER = '-';

export function formatEmpty(value, fallback = EMPTY_PLACEHOLDER) {
  if (value === undefined || value === null || value === '') return fallback;
  return value;
}

export function formatAmount(value) {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 单价按 4 位小数、千分位展示；空值展示 `-`（精度见《6.强盛ERP的编码规则和通用字段规则》Q14）。 */
export function formatUnitPrice(value) {
  if (value === '' || value == null) return EMPTY_PLACEHOLDER;
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return number.toLocaleString('zh-CN', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
}

/** 税率按百分比展示，最多 2 位小数；空值展示 `-`（PCT_4）。 */
export function formatTaxRate(value) {
  if (value === '' || value == null) return EMPTY_PLACEHOLDER;
  const number = Number(value);
  return Number.isFinite(number) ? `${number}%` : `${value}%`;
}

export function calculateNetUnitPrice(line) {
  const price = Number(line.price || 0);
  const rate = Number(line.taxRate || 0);
  if (!rate) return price;
  return price / (1 + rate / 100);
}

/**
 * 价目与价格调整单口径的不含税单价：含税单价 ÷ (1 + 税率÷100)，四舍五入保留 4 位小数。
 * 含税单价或税率为空时返回 null（展示为空），不按 0 计算。
 */
export function calculateNetUnitPrice4(line = {}) {
  const { price, taxRate } = line;
  if (price === '' || price == null) return null;
  if (taxRate === '' || taxRate == null) return null;
  return Math.round((Number(price) / (1 + Number(taxRate) / 100)) * 10000) / 10000;
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
