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
