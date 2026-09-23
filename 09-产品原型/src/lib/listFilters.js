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

/** 查询区是否有生效条件：用于区分“暂无数据”与“没有符合条件”两套空态文案。审核页签不计入。 */
export function hasActiveFilters(filters = {}, ignoreKeys = ['auditStatus']) {
  return Object.entries(filters).some(([key, value]) => {
    if (ignoreKeys.includes(key) || value == null) return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Boolean(value.from || value.to);
    return value !== '';
  });
}
