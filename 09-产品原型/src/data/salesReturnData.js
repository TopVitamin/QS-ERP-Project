import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { readMockRows, writeMockRows } from '../lib/mockStorage.js';
import {
  buildSourceOutboundCandidates as computeSourceOutboundCandidates,
  enrichSalesReturnLine,
  formatDeadlineDate,
  normalizeSalesReturnRow,
  SALES_RETURN_STORAGE_KEY,
} from '../lib/salesReturnLogic.js';
import {
  currencyOptions,
  customerOptions,
  logicalWarehouseOptions,
  productOptions,
  skuOptions,
  unitOptions,
} from './masterData.js';
import { salesOutbounds } from './salesOutboundData.js';

const OUTBOUND_A = 'sales-outbound-seed-1';
const OUTBOUND_B = 'sales-outbound-seed-2';

function findOutbound(outboundId) {
  return salesOutbounds.find((item) => item.id === outboundId) || null;
}

function findOutboundLine(outboundId, index = 0) {
  return findOutbound(outboundId)?.lines?.[index] || null;
}

/** 溯源明细行：商品、价格、税率与来源出库单行均取自原销售出库单 */
function sourcedLine({ id, outboundId, index = 0, quantity, returnedQty = 0, inTransitQty = 0 }) {
  const outbound = findOutbound(outboundId);
  const line = findOutboundLine(outboundId, index) || {};
  return enrichSalesReturnLine({
    id,
    sourceOutboundLineId: line.id || `${outboundId}-line-${index + 1}`,
    sourceOutboundLine: `${outbound?.outboundNo || outboundId} 行${index + 1}`,
    product: line.product || 'SP0101020001',
    productCode: line.productCode || '',
    barcode: line.barcode || '',
    productName: line.productName || '',
    unit: line.unit || '个',
    quantity,
    price: line.price ?? 0,
    taxRate: line.taxRate ?? '',
    returnedQty,
    inTransitQty,
  });
}

/** 无来源明细行：商品由手工选择，价格可留空（提交时再阻断） */
function freeLine({ id, product, quantity, price, taxRate, returnedQty = 0, inTransitQty = 0 }) {
  return enrichSalesReturnLine({ id, product, quantity, price, taxRate, returnedQty, inTransitQty });
}

const sourceOutboundA = findOutbound(OUTBOUND_A);
const sourceOutboundB = findOutbound(OUTBOUND_B);

const seedReturns = [
  {
    id: 'sales-return-1',
    returnNo: 'XSTH-20260919-0001',
    customer: sourceOutboundA?.customer || 'CUS000002',
    warehouse: sourceOutboundA?.warehouse || 'LWH000002',
    currency: sourceOutboundA?.currency || '人民币',
    sourceOutboundId: OUTBOUND_A,
    sourceOutboundNo: sourceOutboundA?.outboundNo || 'XSCK-20260917-0001',
    returnDeadline: '2026-10-31',
    auditStatus: 'draft',
    businessStatus: 'normal',
    remark: '溯源退货草稿，用于验证编辑、提交与删除',
    creator: '张三',
    createdAt: '2026-09-19 10:00:00',
    updater: '张三',
    updatedAt: '2026-09-19 10:00:00',
    lines: [sourcedLine({ id: 'sales-return-1-line-1', outboundId: OUTBOUND_A, quantity: 2 })],
  },
  {
    id: 'sales-return-2',
    returnNo: 'XSTH-20260919-0002',
    customer: 'CUS000001',
    warehouse: 'LWH000001',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-10-25',
    auditStatus: 'draft',
    businessStatus: 'normal',
    remark: '无来源草稿，含税单价留空，保存可过、提交阻断',
    creator: '李四',
    createdAt: '2026-09-19 11:20:00',
    updater: '李四',
    updatedAt: '2026-09-19 11:20:00',
    lines: [freeLine({ id: 'sales-return-2-line-1', product: 'SP0101010001', quantity: 100, price: '', taxRate: '13' })],
  },
  {
    id: 'sales-return-3',
    returnNo: 'XSTH-20260919-0003',
    customer: 'CUS000002',
    warehouse: 'LWH000002',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-10-20',
    auditStatus: 'draft',
    businessStatus: 'normal',
    remark: '两行明细的无来源草稿',
    creator: '王五',
    createdAt: '2026-09-19 13:40:00',
    updater: '王五',
    updatedAt: '2026-09-19 13:40:00',
    lines: [
      freeLine({ id: 'sales-return-3-line-1', product: 'SP0101020001', quantity: 50, price: 169, taxRate: '13' }),
      freeLine({ id: 'sales-return-3-line-2', product: 'SP0101030001', quantity: 10, price: 339, taxRate: '13' }),
    ],
  },
  {
    id: 'sales-return-4',
    returnNo: 'XSTH-20260918-0004',
    customer: 'CUS000003',
    warehouse: 'LWH000003',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-10-18',
    auditStatus: 'pending',
    businessStatus: 'normal',
    remark: '待审核无来源单，用于验证审核、撤回与取消',
    submittedAt: '2026-09-18 14:30:00',
    submitter: '王五',
    creator: '王五',
    createdAt: '2026-09-18 14:10:00',
    updater: '王五',
    updatedAt: '2026-09-18 14:30:00',
    lines: [freeLine({ id: 'sales-return-4-line-1', product: 'SP0102010001', quantity: 6, price: 1500, taxRate: '13' })],
  },
  {
    id: 'sales-return-5',
    returnNo: 'XSTH-20260918-0005',
    customer: sourceOutboundA?.customer || 'CUS000002',
    warehouse: sourceOutboundA?.warehouse || 'LWH000002',
    currency: sourceOutboundA?.currency || '人民币',
    sourceOutboundId: OUTBOUND_A,
    sourceOutboundNo: sourceOutboundA?.outboundNo || 'XSCK-20260917-0001',
    returnDeadline: '2026-10-15',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '已审核部分退回，含待收货通知与已有实收',
    submittedAt: '2026-09-18 09:00:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-18 10:00:00',
    creator: '张三',
    createdAt: '2026-09-18 08:40:00',
    updater: '李四',
    updatedAt: '2026-09-19 16:10:00',
    lines: [sourcedLine({ id: 'sales-return-5-line-1', outboundId: OUTBOUND_A, quantity: 6, returnedQty: 3, inTransitQty: 2 })],
  },
  {
    id: 'sales-return-6',
    returnNo: 'XSTH-20260917-0006',
    customer: sourceOutboundB?.customer || 'CUS000002',
    warehouse: sourceOutboundB?.warehouse || 'LWH000002',
    currency: sourceOutboundB?.currency || '人民币',
    sourceOutboundId: OUTBOUND_B,
    sourceOutboundNo: sourceOutboundB?.outboundNo || 'XSCK-20260918-0001',
    returnDeadline: '2026-10-10',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '全部退足，仅查看追溯',
    submittedAt: '2026-09-17 09:00:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-17 10:00:00',
    creator: '张三',
    createdAt: '2026-09-17 08:30:00',
    updater: '李四',
    updatedAt: '2026-09-18 10:30:00',
    lines: [sourcedLine({ id: 'sales-return-6-line-1', outboundId: OUTBOUND_B, quantity: 5, returnedQty: 5, inTransitQty: 0 })],
  },
  {
    id: 'sales-return-7',
    returnNo: 'XSTH-20260917-0007',
    customer: 'CUS000004',
    warehouse: 'LWH000002',
    currency: '美元',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-10-08',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '待推送与推送失败通知各一张，可整单取消',
    submittedAt: '2026-09-17 11:00:00',
    submitter: '王芳',
    auditor: '李四',
    auditTime: '2026-09-17 13:00:00',
    creator: '王芳',
    createdAt: '2026-09-17 10:40:00',
    updater: '王芳',
    updatedAt: '2026-09-20 09:10:00',
    lines: [freeLine({ id: 'sales-return-7-line-1', product: 'SP0102010001', quantity: 6, price: 1500, taxRate: '0', returnedQty: 0, inTransitQty: 6 })],
  },
  {
    id: 'sales-return-8',
    returnNo: 'XSTH-20260916-0008',
    customer: 'CUS000005',
    warehouse: 'LWH000003',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-09-30',
    auditStatus: 'approved',
    businessStatus: 'closed',
    remark: '手动关闭，已有通知继续执行',
    submittedAt: '2026-09-16 09:00:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-16 10:00:00',
    closeType: 'manual',
    closeReason: '客户不再需要，关闭余量',
    closeTime: '2026-09-20 14:30:00',
    closeOperator: '张三',
    creator: '张三',
    createdAt: '2026-09-16 08:50:00',
    updater: '张三',
    updatedAt: '2026-09-20 14:30:00',
    lines: [freeLine({ id: 'sales-return-8-line-1', product: 'SP0103010001', quantity: 20, price: 189, taxRate: '13', returnedQty: 4, inTransitQty: 8 })],
  },
  {
    id: 'sales-return-9',
    returnNo: 'XSTH-20260916-0009',
    customer: 'CUS000001',
    warehouse: 'LWH000001',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-09-25',
    auditStatus: 'approved',
    businessStatus: 'closed',
    remark: '到期自动关闭，关闭原因与操作人留空',
    submittedAt: '2026-09-16 11:00:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-16 12:00:00',
    closeType: 'auto',
    closeReason: '',
    closeTime: '2026-09-27 00:00:00',
    closeOperator: '',
    creator: '李四',
    createdAt: '2026-09-16 10:40:00',
    updater: '系统',
    updatedAt: '2026-09-27 00:00:00',
    lines: [freeLine({ id: 'sales-return-9-line-1', product: 'SP0101010001', quantity: 30, price: 120, taxRate: '13' })],
  },
  {
    id: 'sales-return-10',
    returnNo: 'XSTH-20260915-0010',
    customer: sourceOutboundA?.customer || 'CUS000002',
    warehouse: sourceOutboundA?.warehouse || 'LWH000002',
    currency: sourceOutboundA?.currency || '人民币',
    sourceOutboundId: OUTBOUND_A,
    sourceOutboundNo: sourceOutboundA?.outboundNo || 'XSCK-20260917-0001',
    returnDeadline: '2026-10-12',
    auditStatus: 'pending',
    businessStatus: 'normal',
    remark: '溯源待审核，额度充足可审核通过',
    submittedAt: '2026-09-15 15:00:00',
    submitter: '张三',
    creator: '张三',
    createdAt: '2026-09-15 14:40:00',
    updater: '张三',
    updatedAt: '2026-09-15 15:00:00',
    lines: [sourcedLine({ id: 'sales-return-10-line-1', outboundId: OUTBOUND_A, quantity: 4 })],
  },
  {
    id: 'sales-return-11',
    returnNo: 'XSTH-20260915-0011',
    customer: sourceOutboundB?.customer || 'CUS000002',
    warehouse: sourceOutboundB?.warehouse || 'LWH000002',
    currency: sourceOutboundB?.currency || '人民币',
    sourceOutboundId: OUTBOUND_B,
    sourceOutboundNo: sourceOutboundB?.outboundNo || 'XSCK-20260918-0001',
    returnDeadline: '2026-10-12',
    auditStatus: 'pending',
    businessStatus: 'normal',
    remark: '溯源待审核，原出库额度已被占用，审核阻断',
    submittedAt: '2026-09-15 16:00:00',
    submitter: '王五',
    creator: '王五',
    createdAt: '2026-09-15 15:40:00',
    updater: '王五',
    updatedAt: '2026-09-15 16:00:00',
    lines: [sourcedLine({ id: 'sales-return-11-line-1', outboundId: OUTBOUND_B, quantity: 5 })],
  },
  {
    id: 'sales-return-12',
    returnNo: 'XSTH-20260914-0012',
    customer: 'CUS000003',
    warehouse: 'LWH000003',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-09-28',
    auditStatus: 'approved',
    businessStatus: 'cancelled',
    remark: '整单取消，通知随单取消',
    submittedAt: '2026-09-14 09:00:00',
    submitter: '李四',
    auditor: '张三',
    auditTime: '2026-09-14 10:00:00',
    cancelReason: '客户取消退货',
    cancelTime: '2026-09-15 11:00:00',
    cancelOperator: '张三',
    creator: '李四',
    createdAt: '2026-09-14 08:40:00',
    updater: '张三',
    updatedAt: '2026-09-15 11:00:00',
    lines: [freeLine({ id: 'sales-return-12-line-1', product: 'SP0101030001', quantity: 8, price: 339, taxRate: '13' })],
  },
  {
    id: 'sales-return-13',
    returnNo: 'XSTH-20260914-0013',
    customer: 'CUS000001',
    warehouse: 'LWH000001',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-10-05',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '存在推送中的收货通知，取消被拦截',
    submittedAt: '2026-09-14 11:00:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-14 13:00:00',
    creator: '张三',
    createdAt: '2026-09-14 10:40:00',
    updater: '张三',
    updatedAt: '2026-09-21 10:05:00',
    lines: [freeLine({ id: 'sales-return-13-line-1', product: 'SP0103010001', quantity: 10, price: 189, taxRate: '13', returnedQty: 0, inTransitQty: 2 })],
  },
  {
    id: 'sales-return-14',
    returnNo: 'XSTH-20260913-0014',
    customer: 'CUS000005',
    warehouse: 'LWH000001',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-10-01',
    auditStatus: 'draft',
    businessStatus: 'normal',
    remark: '撤回后回到草稿，已被下游通知引用（删除阻断演示）',
    returnComment: '数量与实物不符，修改后重提',
    returnedAt: '2026-09-13 15:00:00',
    returnOperator: '李四',
    creator: '李四',
    createdAt: '2026-09-13 14:20:00',
    updater: '李四',
    updatedAt: '2026-09-13 15:00:00',
    lines: [freeLine({ id: 'sales-return-14-line-1', product: 'SP0101010001', quantity: 12, price: 120, taxRate: '13' })],
  },
  {
    id: 'sales-return-15',
    returnNo: 'XSTH-20260913-0015',
    customer: 'CUS000004',
    warehouse: 'LWH000002',
    currency: '人民币',
    sourceOutboundId: '',
    sourceOutboundNo: '',
    returnDeadline: '2026-09-29',
    auditStatus: 'draft',
    businessStatus: 'normal',
    remark: '零价明细，提交前需零价确认',
    creator: '王芳',
    createdAt: '2026-09-13 16:00:00',
    updater: '王芳',
    updatedAt: '2026-09-13 16:00:00',
    lines: [freeLine({ id: 'sales-return-15-line-1', product: 'SP0103010001', quantity: 3, price: 0, taxRate: '13' })],
  },
];

export const salesReturns = seedReturns.map((row) => normalizeSalesReturnRow(row));

// Mock 种子首次加载时写入本地存储：可退额度、删除阻断与关联单据在未打开对应列表前也能读到数据。
if (readMockRows(SALES_RETURN_STORAGE_KEY, null) == null) {
  writeMockRows(SALES_RETURN_STORAGE_KEY, salesReturns);
}

export const salesReturnStatusLabels = {
  auditStatus: { draft: '草稿', pending: '待审核', approved: '已审核' },
  businessStatus: { normal: '正常', cancelled: '已取消', closed: '已关闭' },
};

export const salesReturnLineEditorOptions = {
  productOptions,
  skuOptions,
  unitOptions,
  taxRateControl: 'number',
  showReferencePrice: false,
};

export const defaultSalesReturnForm = {
  id: '',
  returnNo: '保存后自动生成',
  customer: '',
  currency: '人民币',
  warehouse: '',
  returnDeadline: '',
  sourceOutboundId: '',
  sourceOutboundNo: '',
  remark: '',
  lines: [
    {
      id: 'sales-return-line-1',
      sourceOutboundLineId: '',
      sourceOutboundLine: '',
      product: '',
      productCode: '',
      productName: '',
      barcode: '',
      unit: '个',
      quantity: 1,
      price: '',
  taxRate: '',
      returnedQty: 0,
      inTransitQty: 0,
    },
  ],
};

export function getEditableSalesReturn(row) {
  return {
    ...defaultSalesReturnForm,
    id: row?.id || '',
    returnNo: row?.returnNo || defaultSalesReturnForm.returnNo,
    customer: row?.customer || '',
    currency: row?.currency || defaultSalesReturnForm.currency,
    warehouse: row?.warehouse || '',
    returnDeadline: row?.returnDeadline || '',
    sourceOutboundId: row?.sourceOutboundId || '',
    sourceOutboundNo: row?.sourceOutboundNo || '',
    remark: row?.remark ?? '',
    lines: row?.lines?.map((line) => ({ ...line })) || defaultSalesReturnForm.lines,
  };
}

export function getSalesReturnStatusBadges(row) {
  const auditToneMap = { draft: 'warning', pending: 'info', approved: 'success' };
  const businessToneMap = { normal: 'success', cancelled: 'danger', closed: 'danger' };
  return [
    {
      label: salesReturnStatusLabels.auditStatus[row?.auditStatus] || '草稿',
      tone: auditToneMap[row?.auditStatus] || 'warning',
    },
    {
      label: salesReturnStatusLabels.businessStatus[row?.businessStatus] || '正常',
      tone: businessToneMap[row?.businessStatus] || 'success',
    },
  ];
}

const qtyCell = (value) => value ?? 0;

export const salesReturnColumns = [
  { key: 'returnNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, customerOptions) },
  { key: 'warehouse', label: '收货仓库', defaultWidth: 170, minWidth: 130, maxWidth: 230, ellipsis: true, render: (value) => resolveOptionLabel(value, logicalWarehouseOptions) },
  { key: 'sourceOutboundNo', label: '来源销售出库单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'returnDeadline', label: '退货截止日期', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true, render: (value) => formatDeadlineDate(value) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => salesReturnStatusLabels.auditStatus[value] || value, tone: (value) => (value === 'approved' ? 'text-erp-success' : value === 'pending' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'businessStatus', label: '业务状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => salesReturnStatusLabels.businessStatus[value] || value, tone: (value) => (value === 'normal' ? 'text-erp-success' : 'text-erp-danger') },
  { key: 'returnedQtyTotal', label: '累计实退数量', defaultWidth: 118, minWidth: 104, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'inTransitQtyTotal', label: '在途通知数量', defaultWidth: 118, minWidth: 104, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'pushableQtyTotal', label: '可下推数量', defaultWidth: 108, minWidth: 96, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'amount', label: '价税合计', defaultWidth: 124, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'netAmount', label: '金额', defaultWidth: 124, minWidth: 104, maxWidth: 170, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];

export function buildSourceOutboundFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceOutboundNo) return;
    map.set(row.sourceOutboundNo, { value: row.sourceOutboundNo, label: row.sourceOutboundNo });
  });
  return [{ value: '', label: '全部来源销售出库单' }, ...map.values()];
}

/** 溯源选单弹窗候选：已审核销售出库单 + 每行剩余可退额度 */
export function buildSourceOutboundCandidates() {
  return computeSourceOutboundCandidates(salesReturns);
}
