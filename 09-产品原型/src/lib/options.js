export function toSelectOptions(statusMap) {
  return Object.entries(statusMap).map(([value, label]) => ({ value, label }));
}

/** 多选筛选：未选任何项时不过滤；已选则行值须落在选中集合内 */
export function matchesMultiSelect(rowValue, selected) {
  const values = Array.isArray(selected) ? selected : selected ? [selected] : [];
  if (!values.length) return true;
  return values.includes(rowValue);
}
