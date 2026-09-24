import { matchesMultiSelect, toSelectOptions } from './options.js';

/** 业务单据并列状态维度：多选下拉，初值 []，未选等同全部 */
export function statusMultiSelectField(key, label, labelsMap, placeholder = '全部') {
  return {
    key,
    label,
    type: 'multi-select',
    placeholder,
    options: toSelectOptions(labelsMap),
  };
}

export { matchesMultiSelect };

export function matchesDateRange(value, range) {
  if (!range?.from && !range?.to) return true;
  const dateValue = String(value || '').slice(0, 10);
  if (!dateValue) return false;
  if (range.from && dateValue < range.from) return false;
  if (range.to && dateValue > range.to) return false;
  return true;
}

/** 日期＋时间范围比较：值形如 `YYYY-MM-DD HH:mm:ss`，边界字符串按秒逐位比较。 */
export function matchesDateTimeRange(value, range) {
  if (!range?.from && !range?.to) return true;
  const stamp = String(value || '').slice(0, 19);
  if (!stamp) return false;
  if (range.from && stamp < String(range.from).slice(0, 19)) return false;
  if (range.to && stamp > String(range.to).slice(0, 19)) return false;
  return true;
}

/** 查询区是否有生效条件：用于区分“暂无数据”与“没有符合条件”两套空态文案。审核页签不计入。 */
export function hasActiveFilters(filters = {}, ignoreKeys = ['auditStatus']) {
  return Object.entries(filters).some(([key, value]) => {
    if (ignoreKeys.includes(key) || value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value === true;
    if (typeof value === 'object') return Boolean(value.from || value.to);
    return value !== '';
  });
}

/** 拆分批量查询输入：多个值用换行、逗号或分号分隔（库存查询与库存流水的商品编码、条码批量查询）。 */
export function parseBatchSearchTerms(input) {
  return String(input || '')
    .split(/[\s,，、;；]+/)
    .map((term) => term.trim().toLowerCase())
    .filter(Boolean);
}

/** 批量模糊匹配：任一值命中即返回；输入为空时不过滤。 */
export function matchesBatchSearch(value, input) {
  const terms = parseBatchSearchTerms(input);
  if (!terms.length) return true;
  const text = String(value || '').toLowerCase();
  return terms.some((term) => text.includes(term));
}

/** 批量模糊匹配多个候选值（如多条商品条码）：任一条码命中即可。 */
export function matchesBatchSearchIn(values, input) {
  const terms = parseBatchSearchTerms(input);
  if (!terms.length) return true;
  const list = (values || []).map((value) => String(value || '').toLowerCase());
  return terms.some((term) => list.some((value) => value.includes(term)));
}
