import { emptyFieldMessage } from './formValidation.js';
import { getCategoryPath, matchesCategoryFilter, resolveCategorySelection } from '../data/productCategoryData.js';
import { formatNow } from './partnerMasterLogic.js';

export const PRODUCT_STORAGE_KEY = 'qs-erp:products:v1';

export const lifecycleStatusLabels = {
  on_sale: '在售',
  stopped: '停售',
  trial: '试销',
  obsolete: '淘汰',
};

export const lifecycleStatusOptions = Object.entries(lifecycleStatusLabels).map(([value, label]) => ({ value, label }));

export const salesLevelLabels = {
  S: 'S',
  A: 'A',
  B: 'B',
  C: 'C',
  unrated: '未评级',
};

export const salesLevelOptions = [
  { value: 'S', label: 'S' },
  { value: 'A', label: 'A' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'unrated', label: '未评级' },
];

export const brandOptions = [
  { value: '罗技', label: '罗技' },
  { value: '联想', label: '联想' },
  { value: '绿联', label: '绿联' },
  { value: '虚构品牌', label: '虚构品牌' },
  { value: '强盛自营', label: '强盛自营' },
];

export const originOptions = [
  { value: '中国', label: '中国' },
  { value: '美国', label: '美国' },
  { value: '日本', label: '日本' },
];

export function renderSalesLevel(value) {
  if (!value || value === 'unrated') return '未评级';
  return salesLevelLabels[value] || value;
}

export function renderLifecycle(value) {
  return lifecycleStatusLabels[value] || value;
}

export function renderBoolean(value) {
  if (value === true) return '是';
  if (value === false) return '否';
  return '-';
}

export function canEnableProduct(row) {
  return row?.useStatus === 'disabled';
}

export function canDisableProduct(row) {
  return row?.useStatus === 'enabled';
}

export function getDeleteBlockReason(row) {
  if (row.referenced) return '该商品已被业务引用，不能删除，可改为禁用';
  return null;
}

export function createEmptyProductForm() {
  return {
    code: '',
    name: '',
    shortName: '',
    mnemonic: '',
    categoryLevel1: '',
    categoryLevel2: '',
    categoryLevel3: '',
    brand: '',
    model: '',
    spec: '',
    unit: '',
    barcodes: [],
    origin: '',
    remark: '',
    salesLevel: 'unrated',
    lifecycleStatus: 'on_sale',
    firstSaleDate: '',
    stopSaleDate: '',
    initialSupplier: '',
    initialPurchasePrice: '',
    initialSalePrice: '',
    currency: '',
    invoiceName: '',
    invoiceSpec: '',
    taxCode: '',
    defaultTaxRate: '',
    netWeight: '',
    length: '',
    width: '',
    height: '',
    cartonWeight: '',
    cartonLength: '',
    cartonWidth: '',
    cartonHeight: '',
    cartonQty: '',
    auxUnit: '',
    unitConversion: '',
    stockAlertEnabled: false,
    minStock: '',
    maxStock: '',
    safetyStock: '',
    hasBattery: null,
    batchManaged: false,
    serialManaged: false,
    shelfLifeManaged: false,
    shelfLifeDays: '',
    nearExpiryDays: '',
    images: { main: '', left: '', right: '', top: '', bottom: '', back: '', panorama: '' },
  };
}

export function validateProductForSave(form, existingRows = [], currentId = null) {
  const fieldErrors = {};
  const code = String(form.code || '').trim();
  const name = String(form.name || '').trim();

  if (!code) fieldErrors.code = emptyFieldMessage('商品编码');
  if (!name) fieldErrors.name = emptyFieldMessage('商品名称');
  if (!form.categoryLevel3) fieldErrors.categoryLevel3 = '请选择三级商品分类';
  if (!form.unit) fieldErrors.unit = emptyFieldMessage('基本单位');

  if (code && existingRows.some((row) => row.code === code && row.id !== currentId)) {
    fieldErrors.code = '商品编码已存在';
  }

  const barcodes = form.barcodes || [];
  for (const barcode of barcodes) {
    const duplicate = existingRows.find((row) => row.id !== currentId && (row.barcodes || []).includes(barcode));
    if (duplicate) return { message: '该条码已被使用' };
  }

  const purchasePrice = form.initialPurchasePrice;
  const salePrice = form.initialSalePrice;
  if (purchasePrice && !form.initialSupplier) fieldErrors.initialSupplier = '请选择初始供应商';
  if ((purchasePrice || salePrice) && !form.currency) fieldErrors.currency = '请选择币别';

  if (form.stockAlertEnabled && !String(form.minStock || '').trim()) {
    fieldErrors.minStock = emptyFieldMessage('最低库存数量');
  }
  if (form.stockAlertEnabled && form.minStock && (!Number.isInteger(Number(form.minStock)) || Number(form.minStock) <= 0)) {
    fieldErrors.minStock = '库存数量须为大于0的整数';
  }
  if (form.shelfLifeManaged && !String(form.shelfLifeDays || '').trim()) {
    fieldErrors.shelfLifeDays = emptyFieldMessage('保质期天数');
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function formToProductRow(form, contextRow = null) {
  const now = formatNow();
  const categoryId = form.categoryLevel3;
  return {
    ...contextRow,
    ...form,
    categoryId,
    categoryPath: getCategoryPath(categoryId),
    id: contextRow?.id || `product-${Date.now()}`,
    useStatus: contextRow?.useStatus || 'enabled',
    creator: contextRow?.creator || '当前用户',
    createdAt: contextRow?.createdAt || now,
    updater: '当前用户',
    updatedAt: now,
    referenced: contextRow?.referenced || false,
    initialPurchasePrice: contextRow?.initialPurchasePrice ?? form.initialPurchasePrice,
    initialSalePrice: contextRow?.initialSalePrice ?? form.initialSalePrice,
    initialSupplier: contextRow?.initialSupplier ?? form.initialSupplier,
    currency: contextRow?.currency ?? form.currency,
    code: contextRow?.code || form.code,
  };
}

export function applyEnable(row) {
  return { ...row, useStatus: 'enabled', updater: '当前用户', updatedAt: formatNow() };
}

export function applyDisable(row) {
  return { ...row, useStatus: 'disabled', updater: '当前用户', updatedAt: formatNow() };
}

export function productToForm(row) {
  const selection = row.categoryId ? resolveCategorySelection(row.categoryId) : { level1Id: '', level2Id: '', level3Id: '' };
  return {
    code: row.code,
    name: row.name,
    shortName: row.shortName || '',
    mnemonic: row.mnemonic || '',
    categoryLevel1: selection.level1Id,
    categoryLevel2: selection.level2Id,
    categoryLevel3: selection.level3Id,
    brand: row.brand || '',
    model: row.model || '',
    spec: row.spec || '',
    unit: row.unit || '',
    barcodes: [...(row.barcodes || [])],
    origin: row.origin || '',
    remark: row.remark || '',
    salesLevel: row.salesLevel || 'unrated',
    lifecycleStatus: row.lifecycleStatus || 'on_sale',
    firstSaleDate: row.firstSaleDate || '',
    stopSaleDate: row.stopSaleDate || '',
    initialSupplier: row.initialSupplier || '',
    initialPurchasePrice: row.initialPurchasePrice ?? '',
    initialSalePrice: row.initialSalePrice ?? '',
    currency: row.currency || '',
    invoiceName: row.invoiceName || '',
    invoiceSpec: row.invoiceSpec || '',
    taxCode: row.taxCode || '',
    defaultTaxRate: row.defaultTaxRate ?? '',
    netWeight: row.netWeight ?? '',
    length: row.length ?? '',
    width: row.width ?? '',
    height: row.height ?? '',
    cartonWeight: row.cartonWeight ?? '',
    cartonLength: row.cartonLength ?? '',
    cartonWidth: row.cartonWidth ?? '',
    cartonHeight: row.cartonHeight ?? '',
    cartonQty: row.cartonQty ?? '',
    auxUnit: row.auxUnit || '',
    unitConversion: row.unitConversion ?? '',
    stockAlertEnabled: Boolean(row.stockAlertEnabled),
    minStock: row.minStock ?? '',
    maxStock: row.maxStock ?? '',
    safetyStock: row.safetyStock ?? '',
    hasBattery: row.hasBattery ?? null,
    batchManaged: Boolean(row.batchManaged),
    serialManaged: Boolean(row.serialManaged),
    shelfLifeManaged: Boolean(row.shelfLifeManaged),
    shelfLifeDays: row.shelfLifeDays ?? '',
    nearExpiryDays: row.nearExpiryDays ?? '',
    images: { ...(row.images || {}) },
  };
}

export { matchesCategoryFilter };
