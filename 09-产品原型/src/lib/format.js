export function formatAmount(value) {
  return Number(value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function calculateLineAmount(line) {
  return Number(line.quantity || 0) * Number(line.price || 0);
}

export function productLabel(value, options = []) {
  return options.find((option) => option.value === value)?.label || value || '—';
}

export function formatDateTime(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
