import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import {
  createPriceAdjustLineId,
  enrichPriceAdjustLine,
  normalizePriceAdjustRow,
  priceAdjustStatusLabels,
  priceAdjustStatusToneClassNames,
  registerPriceAdjustSeedRows,
} from '../lib/priceAdjustLogic.js';
import {
  getProductDefaultTaxRate,
  priceCustomerLevelLabels,
  priceRangeLabels,
  resolvePriceCurrencyLabel,
} from '../lib/priceLogic.js';
import { customerOptions, productOptions, skuOptions, supplierOptions, unitOptions } from './masterData.js';

/**
 * 价格调整单（采购／销售）列表列、状态字典与演示种子数据。
 * 列顺序按各自详细稿「列表展示=是」；状态 tone 见列表页 Demo PRD §4.3；
 * 已审核单据的明细与 priceData 的价目当前价同源，保证「审核通过后价目表可见新价」。
 */

export const priceAdjustLineEditorOptions = {
  productOptions,
  skuOptions,
  showReferencePrice: false,
  unitOptions,
  taxRateControl: 'number',
};

function seedLine(id, product, price, taxRate) {
  return enrichPriceAdjustLine({ id, product, price, taxRate });
}

const seedPurchaseAdjustments = [
  {
    adjustNo: 'CGJGTZ-20260922-0001',
    supplier: 'SUP000001',
    currency: '人民币',
    auditStatus: 'draft',
    remark: '季度调价',
    creator: '张三',
    createdAt: '2026-09-22 09:10:00',
    updatedAt: '2026-09-22 09:10:00',
    lines: [
      seedLine('purchase-adjust-line-1-1', 'SP0101010001', 88, '13'),
      seedLine('purchase-adjust-line-1-2', 'SP0101020001', 118, '13'),
      seedLine('purchase-adjust-line-1-3', 'SP0101030001', 250, '0'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260922-0002',
    supplier: 'SUP000002',
    currency: '人民币',
    auditStatus: 'draft',
    remark: '背包价格补齐',
    creator: '李四',
    createdAt: '2026-09-22 10:30:00',
    updatedAt: '2026-09-22 10:30:00',
    lines: [
      seedLine('purchase-adjust-line-2-1', 'SP0103010001', 150, '13'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260921-0001',
    supplier: 'SUP000001',
    currency: '人民币',
    auditStatus: 'pending',
    remark: '键盘新品调价',
    creator: '张三',
    createdAt: '2026-09-21 09:05:00',
    submittedAt: '2026-09-21 09:20:00',
    submitter: '张三',
    updatedAt: '2026-09-21 09:20:00',
    lines: [
      seedLine('purchase-adjust-line-3-1', 'SP0101010002', 130, '13'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260921-0002',
    supplier: 'SUP000002',
    currency: '人民币',
    auditStatus: 'pending',
    remark: '网线调价',
    creator: '李四',
    createdAt: '2026-09-21 14:30:00',
    submittedAt: '2026-09-21 14:45:00',
    submitter: '李四',
    updatedAt: '2026-09-21 14:45:00',
    lines: [
      seedLine('purchase-adjust-line-4-1', 'SP0103020001', 20, '0'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260920-0001',
    supplier: 'SUP000001',
    currency: '人民币',
    auditStatus: 'rejected',
    remark: '支架调价',
    creator: '张三',
    createdAt: '2026-09-20 09:20:00',
    submittedAt: '2026-09-20 09:35:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-20 10:05:00',
    returnComment: '税率需复核后重提',
    updatedAt: '2026-09-20 10:05:00',
    lines: [
      seedLine('purchase-adjust-line-5-1', 'SP0102020001', 320, '13'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260920-0002',
    supplier: 'SUP000002',
    currency: '美元',
    auditStatus: 'rejected',
    remark: '美元报价待核',
    creator: '李四',
    createdAt: '2026-09-20 15:00:00',
    submittedAt: '2026-09-20 15:15:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-20 15:40:00',
    returnComment: '美元价格与汇率需复核',
    updatedAt: '2026-09-20 15:40:00',
    lines: [
      seedLine('purchase-adjust-line-6-1', 'SP0103020002', 3.5, '0'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260919-0001',
    supplier: 'SUP000001',
    currency: '美元',
    auditStatus: 'approved',
    remark: '美元报价',
    creator: '张三',
    createdAt: '2026-09-19 09:10:00',
    submittedAt: '2026-09-19 09:25:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-19 10:05:00',
    updatedAt: '2026-09-19 10:05:00',
    lines: [
      seedLine('purchase-adjust-line-7-1', 'SP0101020001', 15.8, '0'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260919-0002',
    supplier: 'SUP000003',
    currency: '美元',
    auditStatus: 'approved',
    remark: '海外供应商调价',
    creator: '张三',
    createdAt: '2026-09-19 15:30:00',
    submittedAt: '2026-09-19 15:45:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-19 16:20:00',
    updatedAt: '2026-09-19 16:20:00',
    lines: [
      seedLine('purchase-adjust-line-8-1', 'SP0101020001', 16.5, '0'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260918-0001',
    supplier: 'SUP000002',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '显示器涨价',
    creator: '李四',
    createdAt: '2026-09-18 14:00:00',
    submittedAt: '2026-09-18 14:20:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-18 15:20:00',
    updatedAt: '2026-09-18 15:20:00',
    lines: [
      seedLine('purchase-adjust-line-9-1', 'SP0102010001', 1180, '13'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260918-0002',
    supplier: 'SUP000001',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '配件调价',
    creator: '张三',
    createdAt: '2026-09-18 16:10:00',
    submittedAt: '2026-09-18 16:30:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-18 17:40:00',
    updatedAt: '2026-09-18 17:40:00',
    lines: [
      seedLine('purchase-adjust-line-10-1', 'SP0103010001', 132, '13'),
      seedLine('purchase-adjust-line-10-2', 'SP0103020001', 19.5, '0'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260917-0001',
    supplier: 'SUP000001',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '季度调价生效',
    creator: '张三',
    createdAt: '2026-09-17 09:20:00',
    submittedAt: '2026-09-17 09:35:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-17 10:05:00',
    updatedAt: '2026-09-17 10:05:00',
    lines: [
      seedLine('purchase-adjust-line-11-1', 'SP0101010001', 92, '13'),
      seedLine('purchase-adjust-line-11-2', 'SP0102020002', 500, '13'),
    ],
  },
  {
    adjustNo: 'CGJGTZ-20260917-0002',
    supplier: 'SUP000002',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '组合调价',
    creator: '李四',
    createdAt: '2026-09-17 09:00:00',
    submittedAt: '2026-09-17 09:10:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-17 09:50:00',
    updatedAt: '2026-09-17 09:50:00',
    lines: [
      seedLine('purchase-adjust-line-12-1', 'SP0101010002', 128, '13'),
      seedLine('purchase-adjust-line-12-2', 'SP0102020001', 310, '13'),
      seedLine('purchase-adjust-line-12-3', 'SP0102020003', 140, '0'),
    ],
  },
];

const seedSalesAdjustments = [
  {
    adjustNo: 'XSJGTZ-20260922-0001',
    range: 'customer',
    customerLevel: '',
    customer: 'CUS000001',
    currency: '人民币',
    auditStatus: 'draft',
    remark: '大客户调价',
    creator: '张三',
    createdAt: '2026-09-22 09:10:00',
    updatedAt: '2026-09-22 09:10:00',
    lines: [
      seedLine('sales-adjust-line-1-1', 'SP0101010001', 108, '13'),
      seedLine('sales-adjust-line-1-2', 'SP0101020001', 145, '13'),
      seedLine('sales-adjust-line-1-3', 'SP0101030001', 320, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260922-0002',
    range: 'level',
    customerLevel: 'A',
    customer: '',
    currency: '人民币',
    auditStatus: 'draft',
    remark: 'A级客户价补齐',
    creator: '李四',
    createdAt: '2026-09-22 10:30:00',
    updatedAt: '2026-09-22 10:30:00',
    lines: [
      seedLine('sales-adjust-line-2-1', 'SP0102010001', 1250, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260921-0001',
    range: 'all',
    customerLevel: '',
    customer: '',
    currency: '人民币',
    auditStatus: 'pending',
    remark: '基准价调整',
    creator: '张三',
    createdAt: '2026-09-21 09:05:00',
    submittedAt: '2026-09-21 09:20:00',
    submitter: '张三',
    updatedAt: '2026-09-21 09:20:00',
    lines: [
      seedLine('sales-adjust-line-3-1', 'SP0103010001', 180, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260921-0002',
    range: 'customer',
    customerLevel: '',
    customer: 'CUS000004',
    currency: '美元',
    auditStatus: 'pending',
    remark: '海外客户美元价',
    creator: '李四',
    createdAt: '2026-09-21 14:30:00',
    submittedAt: '2026-09-21 14:45:00',
    submitter: '李四',
    updatedAt: '2026-09-21 14:45:00',
    lines: [
      seedLine('sales-adjust-line-4-1', 'SP0101030001', 48, '0'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260920-0001',
    range: 'level',
    customerLevel: 'unrated',
    customer: '',
    currency: '人民币',
    auditStatus: 'rejected',
    remark: '未评级客户价',
    creator: '张三',
    createdAt: '2026-09-20 09:20:00',
    submittedAt: '2026-09-20 09:35:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-20 10:05:00',
    returnComment: '未评级客户价格需销售负责人复核',
    updatedAt: '2026-09-20 10:05:00',
    lines: [
      seedLine('sales-adjust-line-5-1', 'SP0101010002', 120, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260920-0002',
    range: 'customer',
    customerLevel: '',
    customer: 'CUS000002',
    currency: '人民币',
    auditStatus: 'rejected',
    remark: '大客户促销价',
    creator: '李四',
    createdAt: '2026-09-20 15:00:00',
    submittedAt: '2026-09-20 15:15:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-20 15:40:00',
    returnComment: '价格低于底价，请复核后重提',
    updatedAt: '2026-09-20 15:40:00',
    lines: [
      seedLine('sales-adjust-line-6-1', 'SP0103020001', 22, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260919-0001',
    range: 'level',
    customerLevel: 'A',
    customer: '',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '等级价调整',
    creator: '张三',
    createdAt: '2026-09-19 09:10:00',
    submittedAt: '2026-09-19 09:25:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-19 10:00:00',
    updatedAt: '2026-09-19 10:00:00',
    lines: [
      seedLine('sales-adjust-line-7-1', 'SP0101010001', 113, '13'),
      seedLine('sales-adjust-line-7-2', 'SP0101020001', 155, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260919-0002',
    range: 'all',
    customerLevel: '',
    customer: '',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '基准价上调',
    creator: '张三',
    createdAt: '2026-09-19 15:30:00',
    submittedAt: '2026-09-19 15:45:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-19 16:10:00',
    updatedAt: '2026-09-19 16:10:00',
    lines: [
      seedLine('sales-adjust-line-8-1', 'SP0101010001', 120, '0'),
      seedLine('sales-adjust-line-8-2', 'SP0102020002', 520, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260918-0001',
    range: 'customer',
    customerLevel: '',
    customer: 'CUS000001',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '大客户价生效',
    creator: '李四',
    createdAt: '2026-09-18 14:00:00',
    submittedAt: '2026-09-18 14:20:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-18 15:00:00',
    updatedAt: '2026-09-18 15:00:00',
    lines: [
      seedLine('sales-adjust-line-9-1', 'SP0101010001', 108, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260917-0001',
    range: 'level',
    customerLevel: 'S',
    customer: '',
    currency: '人民币',
    auditStatus: 'approved',
    remark: 'S级客户调价',
    creator: '张三',
    createdAt: '2026-09-17 09:10:00',
    submittedAt: '2026-09-17 09:30:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-17 10:00:00',
    updatedAt: '2026-09-17 10:00:00',
    lines: [
      seedLine('sales-adjust-line-10-1', 'SP0102010001', 1180, '13'),
      seedLine('sales-adjust-line-10-2', 'SP0103010001', 175, '13'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260917-0002',
    range: 'customer',
    customerLevel: '',
    customer: 'CUS000004',
    currency: '美元',
    auditStatus: 'approved',
    remark: '海外客户美元价',
    creator: '李四',
    createdAt: '2026-09-17 16:10:00',
    submittedAt: '2026-09-17 16:20:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-17 16:50:00',
    updatedAt: '2026-09-17 16:50:00',
    lines: [
      seedLine('sales-adjust-line-11-1', 'SP0101020001', 21, '0'),
      seedLine('sales-adjust-line-11-2', 'SP0101010002', 18, '0'),
    ],
  },
  {
    adjustNo: 'XSJGTZ-20260916-0001',
    range: 'level',
    customerLevel: 'unrated',
    customer: '',
    currency: '人民币',
    auditStatus: 'approved',
    remark: '未评级客户价生效',
    creator: '张三',
    createdAt: '2026-09-16 10:00:00',
    submittedAt: '2026-09-16 10:20:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-16 11:00:00',
    updatedAt: '2026-09-16 11:00:00',
    lines: [
      seedLine('sales-adjust-line-12-1', 'SP0103020001', 20, '13'),
      seedLine('sales-adjust-line-12-2', 'SP0102020003', 130, '13'),
    ],
  },
];

export const purchasePriceAdjustments = seedPurchaseAdjustments.map((row, index) => normalizePriceAdjustRow({
  ...row,
  id: `purchase-adjust-${index + 1}`,
  side: 'purchase',
  updater: row.updater || row.creator || '当前用户',
}));

export const salesPriceAdjustments = seedSalesAdjustments.map((row, index) => normalizePriceAdjustRow({
  ...row,
  id: `sales-adjust-${index + 1}`,
  side: 'sales',
  updater: row.updater || row.creator || '当前用户',
}));

registerPriceAdjustSeedRows('purchase', purchasePriceAdjustments);
registerPriceAdjustSeedRows('sales', salesPriceAdjustments);

const lineCountCell = (value) => value ?? 0;

export const purchaseAdjustColumns = [
  { key: 'adjustNo', label: '单号', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'supplier', label: '供应商', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, supplierOptions) },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: resolvePriceCurrencyLabel },
  { key: 'lineCount', label: '明细条数', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: lineCountCell },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => priceAdjustStatusLabels[value] || value, tone: (value) => priceAdjustStatusToneClassNames[value] || '' },
  { key: 'remark', label: '备注', defaultWidth: 160, minWidth: 120, maxWidth: 240, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'creator', label: '创建人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];

export const salesAdjustColumns = [
  { key: 'adjustNo', label: '单号', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'range', label: '面向范围', defaultWidth: 104, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => priceRangeLabels[value] || value },
  { key: 'customerLevel', label: '客户等级', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => (value ? priceCustomerLevelLabels[value] || value : EMPTY_PLACEHOLDER) },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, customerOptions) },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: resolvePriceCurrencyLabel },
  { key: 'lineCount', label: '明细条数', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: lineCountCell },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => priceAdjustStatusLabels[value] || value, tone: (value) => priceAdjustStatusToneClassNames[value] || '' },
  { key: 'remark', label: '备注', defaultWidth: 160, minWidth: 120, maxWidth: 240, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'creator', label: '创建人', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, defaultVisible: false, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];

export function buildInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}

/** 新增/编辑页明细空行：价格与税率留空待填（采购侧税率不从商品带出）。 */
export function createPriceAdjustLine() {
  return {
    id: createPriceAdjustLineId(),
    product: '',
    productCode: '',
    barcode: '',
    productName: '',
    unit: '',
    price: '',
    taxRate: '',
  };
}

/** 选品带出：编码、条码、名称、基本单位；销售侧按商品税务信息带出税率，带出为空时手填。 */
export function createPriceAdjustLineFromSku(sku, template, side = 'purchase') {
  const sameSku = Boolean(sku?.value) && template?.product === sku.value;
  return {
    ...createPriceAdjustLine(),
    product: sku?.value || '',
    productCode: sku?.skuCode || '',
    productName: sku?.productName || '',
    barcode: sku?.barcode || '',
    unit: sku?.unit && sku.unit !== '-' ? sku.unit : (template?.unit || ''),
    price: sameSku ? template.price : '',
    taxRate: sameSku ? template.taxRate : (side === 'sales' ? getProductDefaultTaxRate(sku?.value) : ''),
  };
}

export const defaultPurchaseAdjustForm = {
  id: '',
  side: 'purchase',
  adjustNo: '保存后显示',
  supplier: '',
  currency: '',
  remark: '',
  lines: [createPriceAdjustLine()],
};

export const defaultSalesAdjustForm = {
  id: '',
  side: 'sales',
  adjustNo: '保存后显示',
  range: '',
  customerLevel: '',
  customer: '',
  currency: '',
  remark: '',
  lines: [createPriceAdjustLine()],
};

export function getEditablePriceAdjust(row, side = 'purchase') {
  if (side === 'sales') {
    if (!row) return { ...defaultSalesAdjustForm, lines: defaultSalesAdjustForm.lines.map((line) => ({ ...line })) };
    return {
      ...defaultSalesAdjustForm,
      id: row.id || '',
      adjustNo: row.adjustNo || defaultSalesAdjustForm.adjustNo,
      range: row.range || '',
      customerLevel: row.customerLevel || '',
      customer: row.customer || '',
      currency: row.currency || defaultSalesAdjustForm.currency,
      remark: row.remark ?? '',
      lines: (row.lines || []).map((line) => ({ ...line })),
    };
  }
  if (!row) return { ...defaultPurchaseAdjustForm, lines: defaultPurchaseAdjustForm.lines.map((line) => ({ ...line })) };
  return {
    ...defaultPurchaseAdjustForm,
    id: row.id || '',
    adjustNo: row.adjustNo || defaultPurchaseAdjustForm.adjustNo,
    supplier: row.supplier || '',
    currency: row.currency || defaultPurchaseAdjustForm.currency,
    remark: row.remark ?? '',
    lines: (row.lines || []).map((line) => ({ ...line })),
  };
}
