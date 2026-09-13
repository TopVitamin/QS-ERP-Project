export function currencySymbol(currency) {
  const symbols = {
    人民币: '¥',
    美元: '$',
    欧元: '€',
    港币: 'HK$',
  };
  return symbols[currency] || '¥';
}
