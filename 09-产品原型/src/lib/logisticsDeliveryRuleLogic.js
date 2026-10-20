import { emptyFieldMessage } from './formValidation.js';
import { getCities, getCnRegionLabels } from './cnAddress.js';
import { formatCodeName } from './codeName.js';
import { formatNow } from './partnerMasterLogic.js';
import { canDisable, canEnable } from './logisticsLogic.js';

export const DELIVERY_RULE_STORAGE_KEY = 'qs-erp:logistics-delivery-rules:v1';

/** Select 组件不展示 value="" 的选项，全省用非空占位值维护。 */
export const CITY_ALL_VALUE = '__ALL_CITIES__';

export { canEnable, canDisable };

export function cityCodeToForm(cityCode) {
  return cityCode ? cityCode : CITY_ALL_VALUE;
}

export function cityCodeFromForm(formValue) {
  return formValue === CITY_ALL_VALUE ? '' : (formValue || '');
}

export function normalizeDeliveryRuleForm(form) {
  return {
    ...form,
    senderCityCode: cityCodeFromForm(form.senderCityCode),
    receiverCityCode: cityCodeFromForm(form.receiverCityCode),
  };
}

export function createEmptyDeliveryRuleForm() {
  return {
    name: '',
    senderProvinceCode: '',
    senderCityCode: CITY_ALL_VALUE,
    receiverProvinceCode: '',
    receiverCityCode: CITY_ALL_VALUE,
    logisticsProductId: '',
    remark: '',
    useStatus: 'enabled',
  };
}

export function deliveryRuleToForm(row) {
  return {
    name: row.name || '',
    senderProvinceCode: row.senderProvinceCode || '',
    senderCityCode: cityCodeToForm(row.senderCityCode),
    receiverProvinceCode: row.receiverProvinceCode || '',
    receiverCityCode: cityCodeToForm(row.receiverCityCode),
    logisticsProductId: row.logisticsProductId || '',
    remark: row.remark || '',
    useStatus: row.useStatus || 'enabled',
  };
}

export function buildRouteKey(row) {
  const senderCity = row.senderCityCode ? row.senderCityCode : '*';
  const receiverCity = row.receiverCityCode ? row.receiverCityCode : '*';
  return [
    row.senderProvinceCode || '',
    senderCity,
    row.receiverProvinceCode || '',
    receiverCity,
  ].join('|');
}

function isCityInProvince(provinceCode, cityCode) {
  if (!cityCode) return true;
  return getCities(provinceCode).some((item) => item.value === cityCode);
}

export function validateDeliveryRuleForSave(form, existingRows = [], products = [], currentId = null) {
  const normalized = normalizeDeliveryRuleForm(form);
  const fieldErrors = {};
  const name = String(normalized.name || '').trim();
  if (!name) fieldErrors.name = emptyFieldMessage('规则名称');
  if (name && existingRows.some((row) => row.name === name && row.id !== currentId)) {
    fieldErrors.name = '规则名称已存在';
  }
  if (!normalized.senderProvinceCode) fieldErrors.senderProvinceCode = emptyFieldMessage('发件省份');
  if (!normalized.receiverProvinceCode) fieldErrors.receiverProvinceCode = emptyFieldMessage('收件省份');
  if (normalized.senderCityCode && !isCityInProvince(normalized.senderProvinceCode, normalized.senderCityCode)) {
    fieldErrors.senderCityCode = '发件城市须属于所选发件省份';
  }
  if (normalized.receiverCityCode && !isCityInProvince(normalized.receiverProvinceCode, normalized.receiverCityCode)) {
    fieldErrors.receiverCityCode = '收件城市须属于所选收件省份';
  }
  if (!normalized.logisticsProductId) fieldErrors.logisticsProductId = emptyFieldMessage('物流服务产品');
  const product = products.find((item) => item.id === normalized.logisticsProductId);
  if (normalized.logisticsProductId && !product) fieldErrors.logisticsProductId = '请选择物流服务产品';
  if (product && product.useStatus === 'disabled') {
    fieldErrors.logisticsProductId = '请选择启用状态的物流服务产品';
  }

  const candidateKey = buildRouteKey({
    senderProvinceCode: normalized.senderProvinceCode,
    senderCityCode: normalized.senderCityCode || '',
    receiverProvinceCode: normalized.receiverProvinceCode,
    receiverCityCode: normalized.receiverCityCode || '',
  });
  const willEnable = (normalized.useStatus || 'enabled') === 'enabled';
  if (willEnable) {
    const conflict = existingRows.find(
      (row) => row.id !== currentId
        && row.useStatus === 'enabled'
        && buildRouteKey(row) === candidateKey,
    );
    if (conflict) {
      fieldErrors.senderProvinceCode = '已存在相同发件／收件省、市组合的启用规则，请调整或先禁用原规则';
    }
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function formToDeliveryRuleRow(form, contextRow = null) {
  const normalized = normalizeDeliveryRuleForm(form);
  const now = formatNow();
  const senderLabels = getCnRegionLabels({
    provinceCode: normalized.senderProvinceCode,
    cityCode: normalized.senderCityCode,
  });
  const receiverLabels = getCnRegionLabels({
    provinceCode: normalized.receiverProvinceCode,
    cityCode: normalized.receiverCityCode,
  });
  return {
    ...contextRow,
    id: contextRow?.id || `delivery-rule-${Date.now()}`,
    name: String(normalized.name || '').trim(),
    senderProvinceCode: normalized.senderProvinceCode,
    senderCityCode: normalized.senderCityCode || '',
    receiverProvinceCode: normalized.receiverProvinceCode,
    receiverCityCode: normalized.receiverCityCode || '',
    senderProvinceName: senderLabels.province,
    senderCityName: normalized.senderCityCode ? senderLabels.city : '',
    receiverProvinceName: receiverLabels.province,
    receiverCityName: normalized.receiverCityCode ? receiverLabels.city : '',
    logisticsProductId: normalized.logisticsProductId,
    remark: normalized.remark || '',
    useStatus: normalized.useStatus || contextRow?.useStatus || 'enabled',
    creator: contextRow?.creator || '当前用户',
    createdAt: contextRow?.createdAt || now,
    updater: '当前用户',
    updatedAt: now,
  };
}

export function applyEnable(row) {
  return { ...row, useStatus: 'enabled', updater: '当前用户', updatedAt: formatNow() };
}

export function applyDisable(row) {
  return { ...row, useStatus: 'disabled', updater: '当前用户', updatedAt: formatNow() };
}

export function renderCityCell(cityName) {
  return cityName ? cityName : '全省';
}

export function renderSenderRoute(row) {
  const province = row.senderProvinceName || '-';
  const city = renderCityCell(row.senderCityName);
  return `${province} / ${city}`;
}

export function renderReceiverRoute(row) {
  const province = row.receiverProvinceName || '-';
  const city = renderCityCell(row.receiverCityName);
  return `${province} / ${city}`;
}

export function buildLogisticsProductOptions(products, includeProductId = '') {
  const enabled = (products || []).filter((item) => item.useStatus === 'enabled');
  const current = (products || []).find((item) => item.id === includeProductId);
  const merged = current && !enabled.some((item) => item.id === current.id)
    ? [current, ...enabled]
    : enabled;
  return merged.map((item) => ({ value: item.id, label: formatCodeName(item.code, item.name) }));
}

export function resolveLogisticsProductLabel(productId, products) {
  const product = (products || []).find((item) => item.id === productId);
  if (!product) return '-';
  return formatCodeName(product.code, product.name);
}

/**
 * 按主 PRD R06 匹配默认物流服务产品（供后续配销订单调用）。
 * @returns {string|null} 物流服务产品 code
 */
export function matchLogisticsProductByRoute(
  { senderProvinceCode, senderCityCode, receiverProvinceCode, receiverCityCode },
  rules,
  products,
) {
  const enabled = (rules || []).filter((row) => row.useStatus === 'enabled');
  const scored = enabled
    .map((rule) => {
      if (rule.senderProvinceCode !== senderProvinceCode) return null;
      if (rule.receiverProvinceCode !== receiverProvinceCode) return null;
      if (rule.senderCityCode && rule.senderCityCode !== senderCityCode) return null;
      if (rule.receiverCityCode && rule.receiverCityCode !== receiverCityCode) return null;
      const senderScore = rule.senderCityCode ? 2 : 1;
      const receiverScore = rule.receiverCityCode ? 2 : 1;
      return { rule, score: senderScore + receiverScore };
    })
    .filter(Boolean);
  if (!scored.length) return null;
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return String(b.rule.updatedAt || '').localeCompare(String(a.rule.updatedAt || ''));
  });
  const product = (products || []).find((item) => item.id === scored[0].rule.logisticsProductId);
  if (!product || product.useStatus !== 'enabled') return null;
  return product.code;
}
