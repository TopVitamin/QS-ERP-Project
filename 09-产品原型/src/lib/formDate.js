import { format, isValid, parseISO } from 'date-fns';

export function parseFormDate(value) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function formatFormDate(value) {
  return value && isValid(value) ? format(value, 'yyyy-MM-dd') : '';
}

/** 日期时间字段（表单值形如 `YYYY-MM-DD HH:mm:ss`） */
export function parseFormDateTime(value) {
  if (!value) return undefined;
  if (value instanceof Date) return isValid(value) ? value : undefined;
  const parsed = parseISO(String(value).trim().replace(' ', 'T'));
  return isValid(parsed) ? parsed : undefined;
}

export function formatFormDateTime(value) {
  return value && isValid(value) ? format(value, 'yyyy-MM-dd HH:mm:ss') : '';
}
