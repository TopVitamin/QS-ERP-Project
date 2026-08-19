export function toSelectOptions(statusMap) {
  return Object.entries(statusMap).map(([value, label]) => ({ value, label }));
}
