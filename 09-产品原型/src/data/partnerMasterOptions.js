import { currencyOptions } from './masterData.js';
import { auxiliaryItems, AUXILIARY_STORAGE_KEY } from './auxiliaryData.js';
import { formatCodeName, resolveOptionLabel } from '../lib/codeName.js';
import { readMockRows } from '../lib/mockStorage.js';

export const supplierCategoryOptions = [
  { value: '充电器类', label: '充电器类' },
  { value: '数据线类', label: '数据线类' },
  { value: '移动电源类', label: '移动电源类' },
  { value: '综合类', label: '综合类' },
  { value: '其他', label: '其他' },
];

export const customerCategoryOptions = [
  { value: '代理商', label: '代理商' },
  { value: '国内电商2C客户', label: '国内电商2C客户' },
  { value: '跨境电商2C客户', label: '跨境电商2C客户' },
  { value: '国内2B客户', label: '国内2B客户' },
  { value: '跨境2B客户', label: '跨境2B客户' },
];

export const partnerLevelOptions = [
  { value: 'S', label: 'S级' },
  { value: 'A', label: 'A级' },
  { value: 'B', label: 'B级' },
  { value: 'C', label: 'C级' },
  { value: 'unrated', label: '未评级' },
];

// 结算方式、付款条件、收款条件取自辅助资料启用项，按 Code-Name 展示（用户确认口径）。
// 存储值沿用资料名称，展示时经 resolveXxxLabel 映射为「编码 名称」，兼容已有演示数据。
function buildAuxiliaryTermOptions(typeId) {
  return readMockRows(AUXILIARY_STORAGE_KEY, auxiliaryItems)
    .filter((row) => row.type === typeId && row.useStatus === 'enabled')
    .map((row) => ({ value: row.name, label: formatCodeName(row.code, row.name), code: row.code, name: row.name }));
}

export function getSettlementMethodOptions() {
  return buildAuxiliaryTermOptions('settlement');
}

export function getPaymentTermsOptions() {
  return buildAuxiliaryTermOptions('payment_terms');
}

export function getCollectionTermsOptions() {
  return buildAuxiliaryTermOptions('collection_terms');
}

export function resolveSettlementMethodLabel(value) {
  return resolveOptionLabel(value, getSettlementMethodOptions());
}

export function resolvePaymentTermsLabel(value) {
  return resolveOptionLabel(value, getPaymentTermsOptions());
}

export function resolveCollectionTermsLabel(value) {
  return resolveOptionLabel(value, getCollectionTermsOptions());
}

export const currencySelectOptions = currencyOptions.map((item) => ({ value: item.value, label: item.label }));

/** 币别统一按「编码 名称」展示（用户确认口径），存储值保持币别名称。 */
export function resolveCurrencyLabel(value) {
  return resolveOptionLabel(value, currencySelectOptions);
}

/** 金额前缀只取币别代码，避免与金额并列时重复显示名称（如 CNY 84.00）。 */
export function resolveCurrencyCode(value) {
  return currencyOptions.find((item) => item.value === value || item.code === value)?.code || value;
}
