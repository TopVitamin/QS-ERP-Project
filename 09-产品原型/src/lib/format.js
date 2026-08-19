import { productOptions } from '../data/purchaseFormData.js';

export function formatAmount(value) {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calculateLineAmount(line) {
  return Number(line.quantity || 0) * Number(line.price || 0);
}

export function productLabel(value, options = productOptions) {
  return options.find((option) => option.value === value)?.label || value || '—';
}
