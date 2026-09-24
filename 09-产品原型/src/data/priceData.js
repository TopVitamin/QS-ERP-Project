import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatTaxRate, formatUnitPrice } from '../lib/format.js';
import {
  enrichPriceRow,
  priceCustomerLevelLabels,
  priceRangeLabels,
  registerPurchasePriceSeedRows,
  registerSalesPriceSeedRows,
  resolvePriceCurrencyLabel,
  upsertPurchasePriceRow,
  upsertSalesPriceRow,
} from '../lib/priceLogic.js';
import { customerOptions, supplierOptions } from './masterData.js';
import { products } from './productData.js';
import { purchasePriceAdjustments, salesPriceAdjustments } from './priceAdjustData.js';

/**
 * 采购价目表、销售价目表列表列与演示种子数据。
 * 列顺序按各自详细稿「列表展示=是」；单价格式见价目表 Demo PRD §4.3（千分位、4 位小数）。
 * 种子数据与调整单种子同源：商品建档生成初始价，已审核调整单按审核先后覆盖，保证两套 Mock 口径一致。
 */

/** 商品建档生成的初始价（《商品资料主PRD》F02：初始供应商、初始含税价、币别）。 */
function buildGeneratedPriceRows() {
  return products
    .filter((product) => product.initialSupplier && product.initialPurchasePrice !== '' && product.initialPurchasePrice != null)
    .map((product) => ({
      id: `price-generated-${product.code}`,
      supplier: product.initialSupplier,
      product: product.code,
      productCode: product.code,
      barcode: '',
      productName: product.name,
      unit: product.unit,
      currency: product.currency || '人民币',
      price: Number(product.initialPurchasePrice),
      taxRate: product.defaultTaxRate || '',
      lastAdjustNo: '',
      creator: product.creator || '阿盛',
      createdAt: product.createdAt,
      updater: product.creator || '阿盛',
      updatedAt: product.createdAt,
    }));
}

function buildPurchasePriceSeedRows() {
  const generated = buildGeneratedPriceRows().map((row) => enrichPriceRow(row));
  return purchasePriceAdjustments
    .filter((row) => row.auditStatus === 'approved')
    .sort((left, right) => String(left.auditTime || '').localeCompare(String(right.auditTime || '')))
    .reduce((rows, adjust) => adjust.lines.reduce(
      (acc, line) => upsertPurchasePriceRow(acc, adjust, line, adjust.auditTime),
      rows,
    ), generated);
}

function buildSalesPriceSeedRows() {
  const generated = products
    .filter((product) => product.initialSalePrice !== '' && product.initialSalePrice != null)
    .map((product) => ({
      id: `sales-price-generated-${product.code}`,
      product: product.code,
      productCode: product.code,
      barcode: '',
      productName: product.name,
      unit: product.unit,
      currency: product.currency || '人民币',
      range: 'all',
      customerLevel: '',
      customer: '',
      price: Number(product.initialSalePrice),
      taxRate: product.defaultTaxRate || '',
      lastAdjustNo: '',
      creator: product.creator || '阿盛',
      createdAt: product.createdAt,
      updater: product.creator || '阿盛',
      updatedAt: product.createdAt,
    }))
    .map((row) => enrichPriceRow(row));
  return salesPriceAdjustments
    .filter((row) => row.auditStatus === 'approved')
    .sort((left, right) => String(left.auditTime || '').localeCompare(String(right.auditTime || '')))
    .reduce((rows, adjust) => adjust.lines.reduce(
      (acc, line) => upsertSalesPriceRow(acc, adjust, line, adjust.auditTime),
      rows,
    ), generated);
}

export const purchasePrices = buildPurchasePriceSeedRows();
export const salesPrices = buildSalesPriceSeedRows();

registerPurchasePriceSeedRows(purchasePrices);
registerSalesPriceSeedRows(salesPrices);

const unitPriceCell = (value) => formatUnitPrice(value);
const taxRateCell = (value) => formatTaxRate(value);

/** 最近调整单号：为空展示 `-`；本地 Mock 审核通过写入的记录带「演示」标记（弹窗与Mock PRD §4.3）。 */
function renderLastAdjustNo(value, row) {
  if (!value) return EMPTY_PLACEHOLDER;
  return row?.isMock ? `${value}（演示）` : value;
}

export const purchasePriceColumns = [
  { key: 'supplier', label: '供应商', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, supplierOptions) },
  { key: 'productCode', label: '商品编码', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
  { key: 'barcode', label: '商品条码', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'productName', label: '商品名称', defaultWidth: 180, minWidth: 140, maxWidth: 260, ellipsis: true },
  { key: 'unit', label: '基本单位', defaultWidth: 88, minWidth: 72, maxWidth: 120, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: resolvePriceCurrencyLabel },
  { key: 'price', label: '含税单价', defaultWidth: 120, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', sortable: true, render: unitPriceCell },
  { key: 'taxRate', label: '税率', defaultWidth: 88, minWidth: 72, maxWidth: 120, ellipsis: true, align: 'right', render: taxRateCell },
  { key: 'netPrice', label: '不含税单价', defaultWidth: 120, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', render: unitPriceCell },
  { key: 'lastAdjustNo', label: '最近调整单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: (row) => Boolean(row.lastAdjustNo), render: renderLastAdjustNo },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'creator', label: '创建人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: (value) => value || EMPTY_PLACEHOLDER },
];

export const salesPriceColumns = [
  { key: 'range', label: '面向范围', defaultWidth: 104, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => priceRangeLabels[value] || value },
  { key: 'customerLevel', label: '客户等级', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => (value ? priceCustomerLevelLabels[value] || value : EMPTY_PLACEHOLDER) },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, customerOptions) },
  { key: 'productCode', label: '商品编码', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
  { key: 'barcode', label: '商品条码', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'productName', label: '商品名称', defaultWidth: 180, minWidth: 140, maxWidth: 260, ellipsis: true },
  { key: 'unit', label: '基本单位', defaultWidth: 88, minWidth: 72, maxWidth: 120, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: resolvePriceCurrencyLabel },
  { key: 'price', label: '含税单价', defaultWidth: 120, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', sortable: true, render: unitPriceCell },
  { key: 'taxRate', label: '税率', defaultWidth: 88, minWidth: 72, maxWidth: 120, ellipsis: true, align: 'right', render: taxRateCell },
  { key: 'netPrice', label: '不含税单价', defaultWidth: 120, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', render: unitPriceCell },
  { key: 'lastAdjustNo', label: '最近调整单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: (row) => Boolean(row.lastAdjustNo), render: renderLastAdjustNo },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'creator', label: '创建人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: (value) => value || EMPTY_PLACEHOLDER },
];

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}
