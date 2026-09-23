import { skuOptions } from './masterData.js';
import { getCategoryPath } from './productCategoryData.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import {
  PRODUCT_STORAGE_KEY,
  renderBoolean,
  renderLifecycle,
  renderSalesLevel,
} from '../lib/productLogic.js';
import { useStatusLabels } from '../lib/partnerMasterLogic.js';

export { PRODUCT_STORAGE_KEY };

const categoryByCode = {
  'SKU-1001': 'cat-keyboard',
  'SKU-1006': 'cat-keyboard',
  'SKU-1002': 'cat-mouse',
  'SKU-1007': 'cat-mouse',
  'SKU-1003': 'cat-dock',
  'SKU-1008': 'cat-dock',
  'SKU-1004': 'cat-monitor',
  'SKU-1005': 'cat-bag',
  'SKU-1009': 'cat-stand',
  'SKU-1010': 'cat-stand',
  'SKU-1011': 'cat-socket',
  'SKU-1012': 'cat-socket',
  'SKU-1013': 'cat-cable',
  'SKU-1014': 'cat-cable',
  'SKU-1015': 'cat-stand',
};

const brandByCode = {
  'SKU-1001': '罗技',
  'SKU-1006': '罗技',
  'SKU-1002': '罗技',
  'SKU-1007': '罗技',
  'SKU-1003': '绿联',
  'SKU-1008': '绿联',
  'SKU-1004': '联想',
  'SKU-1005': '强盛自营',
  'SKU-1009': '绿联',
  'SKU-1010': '绿联',
  'SKU-1011': '绿联',
  'SKU-1012': '绿联',
  'SKU-1013': '绿联',
  'SKU-1014': '绿联',
  'SKU-1015': '绿联',
};

const referencedCodes = new Set(['SKU-1001', 'SKU-1002', 'SKU-1003', 'SKU-1004', 'SKU-1005', 'SKU-1006', 'SKU-1007', 'SKU-1008']);

function buildSeedProduct(sku, index) {
  const categoryId = categoryByCode[sku.skuCode] || 'cat-keyboard';
  const lifecycleStatuses = ['on_sale', 'on_sale', 'on_sale', 'on_sale', 'trial', 'stopped', 'obsolete'];
  const lifecycleStatus = lifecycleStatuses[index % lifecycleStatuses.length];
  const useStatus = index === 12 ? 'disabled' : 'enabled';
  const referenced = referencedCodes.has(sku.skuCode);
  const nowBase = new Date('2026-09-20T10:00:00');
  nowBase.setDate(nowBase.getDate() - index);
  const pad = (value) => String(value).padStart(2, '0');
  const updatedAt = `${nowBase.getFullYear()}-${pad(nowBase.getMonth() + 1)}-${pad(nowBase.getDate())} ${pad(10 + (index % 8))}:${pad((index * 7) % 60)}`;

  return {
    id: `product-${sku.skuCode}`,
    code: sku.skuCode,
    name: sku.productName,
    shortName: sku.productName.length > 8 ? sku.productName.slice(0, 8) : '',
    mnemonic: '',
    categoryId,
    categoryPath: getCategoryPath(categoryId),
    brand: brandByCode[sku.skuCode] || '',
    model: sku.productName.split(' ').slice(-1)[0] || '',
    spec: sku.spec,
    unit: sku.unit,
    barcodes: sku.barcode ? (index === 0 ? [sku.barcode, '6901001991'] : [sku.barcode]) : [],
    origin: '中国',
    remark: index === 0 ? '演示商品，已被业务引用' : '',
    salesLevel: index % 5 === 0 ? 'A' : 'unrated',
    lifecycleStatus,
    useStatus,
    firstSaleDate: '2026-01-15',
    stopSaleDate: lifecycleStatus === 'stopped' ? '2026-08-01' : '',
    initialSupplier: index < 3 ? 'SUP000001' : '',
    initialPurchasePrice: index < 3 ? sku.referencePrice * 0.7 : '',
    initialSalePrice: index < 3 ? sku.referencePrice : '',
    currency: index < 3 ? '人民币' : '',
    invoiceName: '',
    invoiceSpec: '',
    taxCode: '',
    defaultTaxRate: index === 1 ? '13' : '',
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
    stockAlertEnabled: index === 2,
    minStock: index === 2 ? '10' : '',
    maxStock: '',
    safetyStock: '',
    hasBattery: index === 2 ? false : null,
    batchManaged: false,
    serialManaged: false,
    shelfLifeManaged: false,
    shelfLifeDays: '',
    nearExpiryDays: '',
    images: { main: '', left: '', right: '', top: '', bottom: '', back: '', panorama: '' },
    creator: '阿盛',
    createdAt: '2026-08-01 09:00',
    updater: '阿盛',
    updatedAt,
    referenced,
  };
}

export const products = skuOptions.map((sku, index) => buildSeedProduct(sku, index));

function renderUse(value) {
  return useStatusLabels[value] || EMPTY_PLACEHOLDER;
}

function renderBarcodes(value, row) {
  const list = row.barcodes || [];
  if (!list.length) return EMPTY_PLACEHOLDER;
  if (list.length === 1) return list[0];
  return `${list[0]} 等${list.length}条`;
}

export const productColumns = [
  { key: 'thumbnail', label: '主视图', defaultWidth: 72, minWidth: 64, maxWidth: 88 },
  { key: 'code', label: '商品编码', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, link: true },
  { key: 'name', label: '商品名称', defaultWidth: 180, minWidth: 140, maxWidth: 260, ellipsis: true },
  { key: 'categoryPath', label: '商品分类', defaultWidth: 180, minWidth: 140, maxWidth: 240, ellipsis: true },
  { key: 'brand', label: '品牌', defaultWidth: 100, minWidth: 80, maxWidth: 140, ellipsis: true },
  { key: 'model', label: '产品型号', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true },
  { key: 'unit', label: '基本单位', defaultWidth: 88, minWidth: 72, maxWidth: 120, ellipsis: true },
  { key: 'salesLevel', label: '商品销售等级', defaultWidth: 110, minWidth: 96, maxWidth: 140, ellipsis: true, render: renderSalesLevel },
  { key: 'lifecycleStatus', label: '商品生命周期状态', defaultWidth: 130, minWidth: 110, maxWidth: 160, ellipsis: true, render: renderLifecycle },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: renderUse, tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'shortName', label: '商品简称', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
  { key: 'spec', label: '规格描述', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, defaultVisible: false },
  { key: 'barcodes', label: '商品条码', defaultWidth: 140, minWidth: 120, maxWidth: 200, ellipsis: true, defaultVisible: false, render: renderBarcodes },
  { key: 'hasBattery', label: '是否含电池', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, defaultVisible: false, render: renderBoolean },
  { key: 'batchManaged', label: '是否批次管理', defaultWidth: 110, minWidth: 96, maxWidth: 140, ellipsis: true, defaultVisible: false, render: (value) => renderBoolean(value) },
  { key: 'serialManaged', label: '是否序列号管理', defaultWidth: 120, minWidth: 100, maxWidth: 150, ellipsis: true, defaultVisible: false, render: (value) => renderBoolean(value) },
  { key: 'shelfLifeManaged', label: '是否保质期管理', defaultWidth: 120, minWidth: 100, maxWidth: 150, ellipsis: true, defaultVisible: false, render: (value) => renderBoolean(value) },
  { key: 'updater', label: '最后更新人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false },
];

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}
