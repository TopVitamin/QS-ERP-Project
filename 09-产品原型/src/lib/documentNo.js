/**
 * 按《6.强盛ERP的编码规则和通用字段规则》§1.1 生成单据编号：
 * `{前缀}-{YYYYMMDD}-{序号}`，序号默认4位，同日超过9999扩为5位。
 * 日期取本地时间（北京时间），不用 UTC，避免 0–8 点生成的单号日期段错一天。
 */
import { nowDateStamp } from './format.js';

export function nextDocumentNo(prefix, date, existingNos = []) {
  const day = String(date || nowDateStamp()).replaceAll('-', '');
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}-${day}-(\\d+)$`);
  const maxSeq = existingNos.reduce((max, no) => {
    const match = String(no || '').match(pattern);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  const next = maxSeq + 1;
  const width = next > 9999 ? 5 : 4;
  return `${prefix}-${day}-${String(next).padStart(width, '0')}`;
}
