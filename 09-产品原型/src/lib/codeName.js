import { EMPTY_PLACEHOLDER } from './format.js';

export function formatCodeName(code, name) {
  if (!code && !name) return EMPTY_PLACEHOLDER;
  if (!code) return name || EMPTY_PLACEHOLDER;
  if (!name) return code;
  return `${code} ${name}`;
}

export function buildMasterOption({ code, name, defaultCurrency = '人民币' }) {
  return {
    value: code,
    code,
    name,
    label: formatCodeName(code, name),
    defaultCurrency,
  };
}

export function resolveOptionLabel(value, options = []) {
  if (!value) return EMPTY_PLACEHOLDER;
  const matched = options.find((option) => option.value === value || option.name === value || option.code === value);
  return matched?.label || value;
}
