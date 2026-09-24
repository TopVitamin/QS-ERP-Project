import { auxiliaryItems, AUXILIARY_STORAGE_KEY } from '../data/auxiliaryData.js';
import { currencyOptions, skuOptions } from '../data/masterData.js';
import { products } from '../data/productData.js';
import { resolveOptionLabel } from './codeName.js';
import { calculateNetUnitPrice4 } from './format.js';
import { matchesDateRange, matchesMultiSelect } from './listFilters.js';
import { readMockRows, writeMockRows } from './mockStorage.js';

/**
 * 价格管理价目表逻辑：当前价视图、明细口径与审核生效写入。
 * 业务规则依据《采购价目表主PRD》《销售价目表主PRD》R01～R13；字段与枚举依据价格相关详细稿 TSV。
 * 价目表只查看和查询：记录由商品建档生成初始价、调整单审核通过后新增或覆盖。
 */

export const PURCHASE_PRICE_STORAGE_KEY = 'qs-erp:purchase-prices:v1';
export const SALES_PRICE_STORAGE_KEY = 'qs-erp:sales-prices:v1';

export const priceRangeLabels = {
  all: '所有客户',
  level: '客户等级',
  customer: '具体客户',
};

/** 客户等级枚举文字按客户资料：S、A、B、C、未评级（价目表 TSV）。 */
export const priceCustomerLevelLabels = {
  S: 'S',
  A: 'A',
  B: 'B',
  C: 'C',
  unrated: '未评级',
};

export const priceRangeOptions = Object.entries(priceRangeLabels).map(([value, label]) => ({ value, label }));
export const priceCustomerLevelOptions = Object.entries(priceCustomerLevelLabels).map(([value, label]) => ({ value, label }));

let purchasePriceSeedRows = [];
let salesPriceSeedRows = [];

/** 种子数据注册：由 priceData 调用，保证未访问列表页时也能读到演示数据。 */
export function registerPurchasePriceSeedRows(rows = []) {
  purchasePriceSeedRows = rows;
}

export function registerSalesPriceSeedRows(rows = []) {
  salesPriceSeedRows = rows;
}

export function loadAllPurchasePrices() {
  const rows = readMockRows(PURCHASE_PRICE_STORAGE_KEY, purchasePriceSeedRows);
  let normalized = false;
  const nextRows = rows.map((row) => {
    // 商品建档生成的采购初始价没有税率；兼容旧版演示数据曾误从默认销售税率带值。
    if (!String(row.id || '').startsWith('price-generated-') || row.lastAdjustNo || !row.taxRate) return row;
    normalized = true;
    return enrichPriceRow({ ...row, taxRate: '' });
  });
  if (normalized) writeMockRows(PURCHASE_PRICE_STORAGE_KEY, nextRows);
  return nextRows;
}

/** 按采购业务三元组查询当前价；税率为空表示采购人员须按供应商纳税人类型手动补填。 */
export function findCurrentPurchasePrice({ supplier, product, currency }) {
  if (!supplier || !product || !currency) return null;
  return loadAllPurchasePrices().find((row) => (
    row.supplier === supplier && row.product === product && row.currency === currency
  )) || null;
}

export function loadAllSalesPrices() {
  return readMockRows(SALES_PRICE_STORAGE_KEY, salesPriceSeedRows);
}

/** 按具体客户价、客户等级价、所有客户基准价依次查询当前销售价。 */
export function findCurrentSalesPrice({ customer, customerLevel, product, currency }) {
  if (!product || !currency) return null;
  const rows = loadAllSalesPrices();
  const candidates = [
    (row) => customer && row.range === 'customer' && row.customer === customer,
    (row) => customerLevel && row.range === 'level' && row.customerLevel === customerLevel,
    (row) => row.range === 'all',
  ];
  return candidates
    .map((matchesScope) => rows.find((row) => (
      row.product === product && row.currency === currency && matchesScope(row)
    )))
    .find(Boolean) || null;
}

export function nowStamp() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function resolvePriceCurrencyLabel(value) {
  return resolveOptionLabel(value, currencyOptions);
}

/** 启用币别选项：按辅助资料币别字典过滤，展示「编码 名称」（价目表 TSV 取值说明）。 */
export function getEnabledCurrencyOptions() {
  const enabledCodes = new Set(
    readMockRows(AUXILIARY_STORAGE_KEY, auxiliaryItems)
      .filter((row) => row.type === 'currency' && row.useStatus === 'enabled')
      .map((row) => row.code),
  );
  return currencyOptions
    .filter((option) => enabledCodes.has(option.code))
    .map((option) => ({ value: option.value, label: option.label }));
}

/** 商品条码按商品资料实时带出；多条码按英文分号合并展示（TSV 多行文本口径）。 */
export function getProductBarcodes(productCode) {
  const product = products.find((item) => item.code === productCode);
  if (product?.barcodes?.length) return product.barcodes.join(';');
  return skuOptions.find((item) => item.value === productCode)?.barcode || '';
}

/** 商品税务信息里的默认销售税率：销售调整单明细带出用；采购侧不从商品带出。 */
export function getProductDefaultTaxRate(productCode) {
  return products.find((item) => item.code === productCode)?.defaultTaxRate || '';
}

/** 价目记录按商品实时带出编码、条码、名称与基本单位，不保存快照；不含税单价由系统计算。 */
export function enrichPriceRow(row) {
  const sku = skuOptions.find((item) => item.value === row.product);
  return {
    ...row,
    productCode: row.productCode || sku?.skuCode || row.product || '',
    barcode: row.barcode || getProductBarcodes(row.product),
    productName: row.productName || sku?.productName || '',
    unit: row.unit || sku?.unit || '',
    netPrice: calculateNetUnitPrice4(row),
  };
}

function purchasePriceKey(row) {
  return `${row.supplier}|${row.product}|${row.currency}`;
}

function salesPriceKey(row) {
  return [row.product, row.currency, row.range, row.customerLevel || '', row.customer || ''].join('|');
}

function createPriceRowId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 审核通过的采购调整单明细：按「供应商＋商品＋币别」新增或覆盖当前价（主PRD R07）。
 * 覆盖时保留原创建人与创建时间，写入含税单价、税率、不含税单价与最近调整单号。
 */
export function upsertPurchasePriceRow(rows, adjustRow, line, stamp) {
  const nextRow = enrichPriceRow({
    id: createPriceRowId('purchase-price'),
    supplier: adjustRow.supplier,
    product: line.product,
    productCode: line.productCode,
    barcode: line.barcode,
    productName: line.productName,
    unit: line.unit,
    currency: adjustRow.currency,
    price: Number(line.price),
    taxRate: line.taxRate ?? '',
    lastAdjustNo: adjustRow.adjustNo,
    creator: adjustRow.auditor || adjustRow.updater || '当前用户',
    createdAt: stamp || adjustRow.auditTime || nowStamp(),
    updater: adjustRow.auditor || adjustRow.updater || '当前用户',
    updatedAt: stamp || adjustRow.auditTime || nowStamp(),
    // 审核通过后本地 Mock 写入的记录加演示标记（弹窗与Mock PRD §4.3）。
    ...(adjustRow.isMock ? { isMock: true } : {}),
  });
  const key = purchasePriceKey(nextRow);
  const index = rows.findIndex((row) => purchasePriceKey(row) === key);
  if (index < 0) return [nextRow, ...rows];
  return rows.map((row, rowIndex) => (rowIndex === index
    ? { ...nextRow, id: row.id, creator: row.creator, createdAt: row.createdAt }
    : row));
}

/** 审核通过的销售调整单明细：按「商品＋币别＋面向范围」新增或覆盖当前价（主PRD R07）。 */
export function upsertSalesPriceRow(rows, adjustRow, line, stamp) {
  const nextRow = enrichPriceRow({
    id: createPriceRowId('sales-price'),
    product: line.product,
    productCode: line.productCode,
    barcode: line.barcode,
    productName: line.productName,
    unit: line.unit,
    currency: adjustRow.currency,
    range: adjustRow.range,
    customerLevel: adjustRow.range === 'level' ? adjustRow.customerLevel : '',
    customer: adjustRow.range === 'customer' ? adjustRow.customer : '',
    price: Number(line.price),
    taxRate: line.taxRate ?? '',
    lastAdjustNo: adjustRow.adjustNo,
    creator: adjustRow.auditor || adjustRow.updater || '当前用户',
    createdAt: stamp || adjustRow.auditTime || nowStamp(),
    updater: adjustRow.auditor || adjustRow.updater || '当前用户',
    updatedAt: stamp || adjustRow.auditTime || nowStamp(),
    // 审核通过后本地 Mock 写入的记录加演示标记（弹窗与Mock PRD §4.3）。
    ...(adjustRow.isMock ? { isMock: true } : {}),
  });
  const key = salesPriceKey(nextRow);
  const index = rows.findIndex((row) => salesPriceKey(row) === key);
  if (index < 0) return [nextRow, ...rows];
  return rows.map((row, rowIndex) => (rowIndex === index
    ? { ...nextRow, id: row.id, creator: row.creator, createdAt: row.createdAt }
    : row));
}

/**
 * Demo Mock（弹窗与Mock PRD §4）：调整单审核通过后本地新增或覆盖价目表当前价。
 * 正式验收不以此为准，仅用于原型串联「审核 → 价目表 → 取价」。
 */
export function applyApprovedAdjustmentToPriceList(adjustRow) {
  if (adjustRow?.side === 'sales') {
    const rows = (adjustRow.lines || []).reduce(
      (acc, line) => upsertSalesPriceRow(acc, adjustRow, line, adjustRow.auditTime),
      loadAllSalesPrices(),
    );
    writeMockRows(SALES_PRICE_STORAGE_KEY, rows);
    return;
  }
  const rows = (adjustRow?.lines || []).reduce(
    (acc, line) => upsertPurchasePriceRow(acc, adjustRow, line, adjustRow.auditTime),
    loadAllPurchasePrices(),
  );
  writeMockRows(PURCHASE_PRICE_STORAGE_KEY, rows);
}

/** 采购价目表筛选：供应商、商品编码、商品条码、商品名称、币别、最近调整单号、最后更新时间。 */
export function filterPurchasePriceRows(row, filters = {}) {
  const productCode = String(filters.productCode || '').trim().toLowerCase();
  const barcode = String(filters.barcode || '').trim().toLowerCase();
  const productName = String(filters.productName || '').trim().toLowerCase();
  const adjustNo = String(filters.lastAdjustNo || '').trim().toLowerCase();

  return (!filters.supplier || row.supplier === filters.supplier)
    && (!productCode || String(row.productCode || '').toLowerCase().includes(productCode))
    && (!barcode || String(row.barcode || '').toLowerCase().includes(barcode))
    && (!productName || String(row.productName || '').toLowerCase().includes(productName))
    && (!filters.currency || row.currency === filters.currency)
    && (!adjustNo || String(row.lastAdjustNo || '').toLowerCase().includes(adjustNo))
    && matchesDateRange(row.updatedAt, filters.updatedAtRange);
}

/** 销售价目表筛选：面向范围、客户等级、客户、商品编码、商品条码、商品名称、币别、最近调整单号、最后更新时间。 */
export function filterSalesPriceRows(row, filters = {}) {
  const productCode = String(filters.productCode || '').trim().toLowerCase();
  const barcode = String(filters.barcode || '').trim().toLowerCase();
  const productName = String(filters.productName || '').trim().toLowerCase();
  const adjustNo = String(filters.lastAdjustNo || '').trim().toLowerCase();

  return matchesMultiSelect(row.range, filters.range)
    && matchesMultiSelect(row.customerLevel, filters.customerLevel)
    && (!filters.customer || row.customer === filters.customer)
    && (!productCode || String(row.productCode || '').toLowerCase().includes(productCode))
    && (!barcode || String(row.barcode || '').toLowerCase().includes(barcode))
    && (!productName || String(row.productName || '').toLowerCase().includes(productName))
    && (!filters.currency || row.currency === filters.currency)
    && (!adjustNo || String(row.lastAdjustNo || '').toLowerCase().includes(adjustNo))
    && matchesDateRange(row.updatedAt, filters.updatedAtRange);
}
