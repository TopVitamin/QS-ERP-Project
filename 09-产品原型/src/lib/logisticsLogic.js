import { emptyFieldMessage } from './formValidation.js';
import { formatCodeName } from './codeName.js';
import { formatNow } from './partnerMasterLogic.js';

export const CARRIER_STORAGE_KEY = 'qs-erp:logistics-carriers:v2';
export const PRODUCT_STORAGE_KEY = 'qs-erp:logistics-products:v2';

export const transportTypeLabels = {
  domestic_express: '国内快递',
  domestic_ltl: '国内零担',
  domestic_ftl: '国内整车',
  international_express: '国际快递',
};

export const transportTypeOptions = Object.entries(transportTypeLabels).map(([value, label]) => ({ value, label }));

export function renderTransportType(value) {
  return transportTypeLabels[value] || value || '-';
}

export function canEnable(row) {
  return row?.useStatus === 'disabled';
}

export function canDisable(row) {
  return row?.useStatus === 'enabled';
}

export function canAddServiceProduct(carriers) {
  return (carriers || []).some((item) => item.useStatus === 'enabled');
}

export function getCarrierDeleteBlockReason(row, products = []) {
  if ((products || []).some((item) => item.carrierId === row.id)) {
    return '该物流商下已有服务产品，不能删除';
  }
  if (row.referenced) return '该物流商已被业务引用，不能删除，可改为禁用';
  return null;
}

export function getProductDeleteBlockReason(row) {
  if (row.referenced) return '该产品已被业务引用，不能删除，可改为禁用';
  return null;
}

export function createEmptyCarrierForm() {
  return {
    code: '',
    name: '',
    contact: '',
    phone: '',
    address: '',
    useStatus: 'enabled',
  };
}

export function createEmptyProductForm() {
  return {
    code: '',
    name: '',
    carrierId: '',
    transportType: '',
    useStatus: 'enabled',
  };
}

export function validateCarrierForSave(form, existingRows = [], currentId = null) {
  const fieldErrors = {};
  const code = String(form.code || '').trim();
  const name = String(form.name || '').trim();
  if (!code) fieldErrors.code = emptyFieldMessage('物流商编码');
  if (!name) fieldErrors.name = emptyFieldMessage('物流商名称');
  if (code && existingRows.some((row) => row.code === code && row.id !== currentId)) {
    fieldErrors.code = '物流商编码已存在';
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function validateProductForSave(form, existingRows = [], carriers = [], currentId = null) {
  const fieldErrors = {};
  const code = String(form.code || '').trim();
  const name = String(form.name || '').trim();
  if (!code) fieldErrors.code = emptyFieldMessage('物流服务产品编码');
  if (!name) fieldErrors.name = emptyFieldMessage('物流服务产品名称');
  if (!form.carrierId) fieldErrors.carrierId = '请选择所属物流商';
  if (code && existingRows.some((row) => row.code === code && row.id !== currentId)) {
    fieldErrors.code = '物流服务产品编码已存在';
  }
  const carrier = carriers.find((item) => item.id === form.carrierId);
  if (form.carrierId && !carrier) fieldErrors.carrierId = '请选择所属物流商';
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function applyEnable(row) {
  return { ...row, useStatus: 'enabled', updater: '当前用户', updatedAt: formatNow() };
}

export function applyDisable(row) {
  return { ...row, useStatus: 'disabled', updater: '当前用户', updatedAt: formatNow() };
}

export function carrierToForm(row) {
  return {
    code: row.code,
    name: row.name,
    contact: row.contact || '',
    phone: row.phone || '',
    address: row.address || '',
    useStatus: row.useStatus || 'enabled',
  };
}

export function productToForm(row) {
  return {
    code: row.code,
    name: row.name,
    carrierId: row.carrierId || '',
    transportType: row.transportType || '',
    useStatus: row.useStatus || 'enabled',
  };
}

export function formToCarrierRow(form, contextRow = null) {
  const now = formatNow();
  return {
    ...contextRow,
    ...form,
    id: contextRow?.id || `carrier-${Date.now()}`,
    useStatus: form.useStatus || contextRow?.useStatus || 'enabled',
    creator: contextRow?.creator || '当前用户',
    createdAt: contextRow?.createdAt || now,
    updater: '当前用户',
    updatedAt: now,
    referenced: contextRow?.referenced || false,
    code: contextRow?.code || form.code,
  };
}

export function formToProductRow(form, contextRow = null) {
  const now = formatNow();
  return {
    ...contextRow,
    ...form,
    id: contextRow?.id || `logistics-product-${Date.now()}`,
    useStatus: form.useStatus || contextRow?.useStatus || 'enabled',
    creator: contextRow?.creator || '当前用户',
    createdAt: contextRow?.createdAt || now,
    updater: '当前用户',
    updatedAt: now,
    referenced: contextRow?.referenced || false,
    code: contextRow?.code || form.code,
  };
}

export function resolveCarrierLabel(carrierId, carriers) {
  const carrier = carriers.find((item) => item.id === carrierId);
  if (!carrier) return '-';
  return formatCodeName(carrier.code, carrier.name);
}

export function buildCarrierOptions(carriers, includeCarrierId = '') {
  const enabled = carriers.filter((item) => item.useStatus === 'enabled');
  const current = carriers.find((item) => item.id === includeCarrierId);
  const merged = current && !enabled.some((item) => item.id === current.id) ? [current, ...enabled] : enabled;
  return merged.map((item) => ({ value: item.id, label: formatCodeName(item.code, item.name) }));
}
