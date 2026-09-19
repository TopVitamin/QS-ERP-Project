/**
 * 按《6.强盛ERP的编码规则和通用字段规则》§1.1 生成单据编号：
 * `{前缀}-{YYYYMMDD}-{序号}`，序号默认4位，同日超过9999扩为5位。
 */
export function nextDocumentNo(prefix, date, existingNos = []) {
  const day = String(date || new Date().toISOString().slice(0, 10)).replaceAll('-', '');
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
