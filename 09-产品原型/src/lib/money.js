export function currencySymbol(currency) {
  const symbols = {
    人民币: '¥',
    美元: '$',
    欧元: '€',
    港币: 'HK$',
  };
  return symbols[currency] || '¥';
}

/** 金额四舍五入到 2 位小数：消除二进制浮点累加误差，落库与展示口径一致。 */
export function roundAmount(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

/** 单价四舍五入到 4 位小数（含税／不含税单价统一精度）。 */
export function roundUnitPrice(value) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}
