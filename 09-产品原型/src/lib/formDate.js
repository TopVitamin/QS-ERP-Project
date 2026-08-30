import { format, isValid, parseISO } from 'date-fns';

export function parseFormDate(value) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function formatFormDate(value) {
  return value && isValid(value) ? format(value, 'yyyy-MM-dd') : '';
}
