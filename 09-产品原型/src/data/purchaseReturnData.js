import { resolveOptionLabel } from '../lib/codeName.js';
import { formatAmount } from '../lib/format.js';
import {
  enrichReturnLine,
  formatDeadlineDate,
  normalizeReturnRow,
  registerReturnSeedRows,
} from '../lib/purchaseReturnLogic.js';
import { currencyOptions, productOptions, skuOptions, supplierOptions, unitOptions, logicalWarehouseOptions } from './masterData.js';
import { inboundOrders } from './inboundData.js';
import { purchaseReturnNotices } from './purchaseReturnNoticeData.js';

/**
 * 采购退货单列表列、状态字典与演示种子数据。
 * 列顺序按《采购退货单（详细稿）》「列表展示=是」；状态 tone 见列表页 Demo PRD §4.3。
 */

export const purchaseReturnStatusLabels = {
  auditStatus: { draft: '草稿', pending: '待审核', approved: '已审核' },
  businessStatus: { normal: '正常', cancelled: '已取消', closed: '已关闭' },
};

export const purchaseReturnLineEditorOptions = {
  productOptions,
  skuOptions,
  unitOptions,
  taxRateControl: 'number',
  showReferencePrice: false,
};

function seedLine({
  id,
  product,
  quantity,
  price,
  taxRate = '',
  sourceInboundLineId = '',
  sourceInboundLine = '',
}) {
  return enrichReturnLine({
    id,
    product,
    quantity,
    price,
    taxRate,
    sourceInboundLineId,
    sourceInboundLine,
    receivedQty: 0,
    inTransitQty: 0,
  });
}

/** 有来源行：商品、数量与价格沿原采购入库单（主PRD R03、R04） */
function seedSourceLine(inboundNo, { id }) {
  const inbound = inboundOrders.find((row) => row.inboundNo === inboundNo);
  const inboundLine = inbound?.lines?.[0];
  if (!inboundLine) return null;
  return seedLine({
    id,
    product: inboundLine.product,
    quantity: inboundLine.quantity,
    price: inboundLine.price,
    taxRate: inboundLine.taxRate,
    sourceInboundLineId: inboundLine.id,
    sourceInboundLine: `${inbound.inboundNo} 行1`,
  });
}

const seedReturns = [
  {
    returnNo: 'CGTH-20260921-0001',
    supplier: 'SUP000001',
    currency: '人民币',
    warehouse: 'LWH000001',
    returnDeadline: '2026-10-15',
    sourceInboundNo: '',
    auditStatus: 'draft',
    businessStatus: 'normal',
    remark: '示例补货退货',
    creator: '张三',
    createdAt: '2026-09-21 09:10:00',
    updatedAt: '2026-09-21 09:10:00',
    lines: [
      seedLine({ id: 'return-line-1-1', product: 'SP0101010001', quantity: 100, price: 113 }),
      seedLine({ id: 'return-line-1-2', product: 'SP0101030001', quantity: 20, price: 339 }),
    ],
  },
  {
    returnNo: 'CGTH-20260921-0002',
    supplier: 'SUP000002',
    currency: '人民币',
    warehouse: 'LWH000002',
    returnDeadline: '2026-10-18',
    sourceInboundNo: '',
    auditStatus: 'draft',
    businessStatus: 'normal',
    remark: '零价演示草稿',
    creator: '李四',
    createdAt: '2026-09-21 10:20:00',
    updatedAt: '2026-09-21 10:20:00',
    lines: [
      seedLine({ id: 'return-line-2-1', product: 'SP0103010001', quantity: 30, price: 0 }),
    ],
  },
  {
    returnNo: 'CGTH-20260920-0003',
    supplier: 'SUP000001',
    currency: '人民币',
    warehouse: 'LWH000001',
    returnDeadline: '2026-10-10',
    sourceInboundNo: '',
    auditStatus: 'pending',
    businessStatus: 'normal',
    submittedAt: '2026-09-20 11:20:00',
    submitter: '张三',
    creator: '张三',
    createdAt: '2026-09-20 11:05:00',
    updatedAt: '2026-09-20 11:20:00',
    lines: [
      seedLine({ id: 'return-line-3-1', product: 'SP0102010001', quantity: 12, price: 1299 }),
    ],
  },
  {
    returnNo: 'CGTH-20260920-0004',
    supplier: 'SUP000002',
    currency: '人民币',
    warehouse: 'LWH000002',
    returnDeadline: '2026-10-12',
    sourceInboundNo: '',
    auditStatus: 'pending',
    businessStatus: 'normal',
    submittedAt: '2026-09-20 15:00:00',
    submitter: '李四',
    creator: '李四',
    createdAt: '2026-09-20 14:40:00',
    updatedAt: '2026-09-20 15:00:00',
    lines: [
      seedLine({ id: 'return-line-4-1', product: 'SP0101010002', quantity: 40, price: 125 }),
    ],
  },
  {
    returnNo: 'CGTH-20260919-0005',
    supplier: 'SUP000001',
    currency: '人民币',
    warehouse: 'LWH000001',
    returnDeadline: '2026-10-20',
    sourceInboundNo: '',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '分批退货演示',
    submittedAt: '2026-09-19 09:40:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-19 10:00:00',
    creator: '张三',
    createdAt: '2026-09-19 09:30:00',
    updatedAt: '2026-09-21 10:05:00',
    lines: [
      seedLine({ id: 'return-line-5-1', product: 'SP0101010001', quantity: 100, price: 113 }),
    ],
  },
  {
    returnNo: 'CGTH-20260919-0006',
    supplier: 'SUP000002',
    currency: '人民币',
    warehouse: 'LWH000002',
    returnDeadline: '2026-10-22',
    sourceInboundNo: 'CGRK-20260917-0001',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '关联原入库退货',
    submittedAt: '2026-09-19 15:10:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-19 15:30:00',
    creator: '李四',
    createdAt: '2026-09-19 15:00:00',
    updatedAt: '2026-09-19 16:40:00',
    lines: [
      seedSourceLine('CGRK-20260917-0001', { id: 'return-line-6-1' }),
    ],
  },
  {
    returnNo: 'CGTH-20260918-0007',
    supplier: 'SUP000001',
    currency: '人民币',
    warehouse: 'LWH000001',
    returnDeadline: '2026-09-30',
    sourceInboundNo: '',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '全部退足演示单',
    submittedAt: '2026-09-18 10:30:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-18 10:40:00',
    creator: '张三',
    createdAt: '2026-09-18 10:15:00',
    updatedAt: '2026-09-18 10:15:00',
    lines: [
      seedLine({ id: 'return-line-7-1', product: 'SP0101020002', quantity: 20, price: 165 }),
    ],
  },
  {
    returnNo: 'CGTH-20260918-0008',
    supplier: 'SUP000002',
    currency: '人民币',
    warehouse: 'LWH000002',
    returnDeadline: '2026-10-25',
    sourceInboundNo: '',
    auditStatus: 'approved',
    businessStatus: 'normal',
    remark: '存在执行中通知的演示单',
    submittedAt: '2026-09-18 16:35:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-18 16:50:00',
    creator: '李四',
    createdAt: '2026-09-18 16:20:00',
    updatedAt: '2026-09-20 11:05:00',
    lines: [
      seedLine({ id: 'return-line-8-1', product: 'SP0103020001', quantity: 100, price: 18 }),
    ],
  },
  {
    returnNo: 'CGTH-20260917-0009',
    supplier: 'SUP000001',
    currency: '人民币',
    warehouse: 'LWH000001',
    returnDeadline: '2026-09-28',
    sourceInboundNo: '',
    auditStatus: 'approved',
    businessStatus: 'closed',
    closeType: 'manual',
    closeReason: '供应商不再接收本批退货',
    closeTime: '2026-09-19 14:30:00',
    closeOperator: '张三',
    submittedAt: '2026-09-17 09:10:00',
    submitter: '张三',
    auditor: '李四',
    auditTime: '2026-09-17 09:20:00',
    creator: '张三',
    createdAt: '2026-09-17 09:00:00',
    updatedAt: '2026-09-19 14:30:00',
    lines: [
      seedLine({ id: 'return-line-9-1', product: 'SP0102020001', quantity: 30, price: 299 }),
    ],
  },
  {
    returnNo: 'CGTH-20260916-0010',
    supplier: 'SUP000002',
    currency: '人民币',
    warehouse: 'LWH000002',
    returnDeadline: '2026-09-20',
    sourceInboundNo: '',
    auditStatus: 'approved',
    businessStatus: 'closed',
    closeType: 'auto',
    closeReason: '',
    closeTime: '2026-09-22 00:00:00',
    closeOperator: '',
    submittedAt: '2026-09-16 13:50:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-16 14:00:00',
    creator: '李四',
    createdAt: '2026-09-16 13:40:00',
    updatedAt: '2026-09-22 00:00:00',
    lines: [
      seedLine({ id: 'return-line-10-1', product: 'SP0102020002', quantity: 8, price: 489 }),
    ],
  },
  {
    returnNo: 'CGTH-20260915-0011',
    supplier: 'SUP000002',
    currency: '人民币',
    warehouse: 'LWH000002',
    returnDeadline: '2026-09-29',
    sourceInboundNo: 'CGRK-20260918-0001',
    auditStatus: 'approved',
    businessStatus: 'cancelled',
    cancelReason: '供应商不接收退货',
    cancelTime: '2026-09-16 10:20:00',
    cancelOperator: '李四',
    submittedAt: '2026-09-15 11:40:00',
    submitter: '李四',
    auditor: '李四',
    auditTime: '2026-09-15 11:50:00',
    creator: '李四',
    createdAt: '2026-09-15 11:30:00',
    updatedAt: '2026-09-16 10:20:00',
    lines: [
      seedSourceLine('CGRK-20260918-0001', { id: 'return-line-11-1' }),
    ],
  },
  {
    returnNo: 'CGTH-20260915-0012',
    supplier: 'SUP000001',
    currency: '人民币',
    warehouse: 'LWH000001',
    returnDeadline: '2026-10-01',
    sourceInboundNo: '',
    auditStatus: 'draft',
    businessStatus: 'cancelled',
    cancelReason: '退货安排取消',
    cancelTime: '2026-09-16 09:00:00',
    cancelOperator: '张三',
    creator: '张三',
    createdAt: '2026-09-15 09:05:00',
    updatedAt: '2026-09-16 09:00:00',
    lines: [
      seedLine({ id: 'return-line-12-1', product: 'SP0103030001', quantity: 10, price: 99 }),
    ],
  },
];

/**
 * 累计实出数量、在途通知数量由采退发货通知单种子推导，保证两套 Mock 数量口径一致：
 * 已发货通知计入累计实出；未结束通知（含推送中、待发货、取消中、推送失败）计入在途；已取消释放。
 */
function applyNoticeOccupancy(lines, returnId) {
  const occupancy = new Map();
  purchaseReturnNotices
    .filter((notice) => notice.sourceReturnId === returnId && notice.status !== 'cancelled')
    .forEach((notice) => {
      (notice.lines || []).forEach((line) => {
        const key = line.sourceReturnLineId || line.id;
        const current = occupancy.get(key) || { receivedQty: 0, inTransitQty: 0 };
        if (notice.status === 'shipped') current.receivedQty += Number(line.shippedQty || 0);
        else current.inTransitQty += Number(line.notifyQty || 0);
        occupancy.set(key, current);
      });
    });

  return lines.map((line) => {
    const current = occupancy.get(line.id);
    if (!current) return line;
    return { ...line, ...current };
  });
}

export const purchaseReturns = seedReturns.map((row, index) => normalizeReturnRow({
  ...row,
  id: `return-${index + 1}`,
  lines: applyNoticeOccupancy(row.lines.filter(Boolean), `return-${index + 1}`),
  updater: row.updater || row.creator || '当前用户',
}));

registerReturnSeedRows(purchaseReturns);
// 通知单种子在 purchaseReturnNoticeData 中自行登记；本文件引用它用于推导数量口径与 R11 取消拦截。

export function getReturnStatusBadges(row) {
  const auditToneMap = { draft: 'warning', pending: 'info', approved: 'success' };
  const businessToneMap = { normal: 'success', cancelled: 'danger', closed: 'danger' };
  return [
    { label: purchaseReturnStatusLabels.auditStatus[row.auditStatus] || row.auditStatus, tone: auditToneMap[row.auditStatus] || 'default' },
    { label: purchaseReturnStatusLabels.businessStatus[row.businessStatus] || row.businessStatus, tone: businessToneMap[row.businessStatus] || 'default' },
  ];
}

const qtyCell = (value) => value ?? 0;

export const purchaseReturnColumns = [
  { key: 'returnNo', label: '单号', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'supplier', label: '供应商', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, supplierOptions) },
  { key: 'warehouse', label: '出库仓库', defaultWidth: 180, minWidth: 140, maxWidth: 240, ellipsis: true, render: (value) => resolveOptionLabel(value, logicalWarehouseOptions) },
  { key: 'sourceInboundNo', label: '来源采购入库单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'returnDeadline', label: '退货截止日期', defaultWidth: 170, minWidth: 150, maxWidth: 210, ellipsis: true, sortable: true, render: (value) => formatDeadlineDate(value) },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => purchaseReturnStatusLabels.auditStatus[value] || value, tone: (value) => (value === 'approved' ? 'text-erp-success' : value === 'pending' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'businessStatus', label: '业务状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => purchaseReturnStatusLabels.businessStatus[value] || value, tone: (value) => (value === 'normal' ? 'text-erp-success' : 'text-erp-danger') },
  { key: 'totalShippedQty', label: '累计实出数量', defaultWidth: 120, minWidth: 100, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalNotifyQty', label: '在途通知数量', defaultWidth: 120, minWidth: 100, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalPushableQty', label: '可下推数量', defaultWidth: 112, minWidth: 96, maxWidth: 150, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'amount', label: '价税合计', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'netAmount', label: '金额', defaultWidth: 132, minWidth: 112, maxWidth: 180, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
];

export function buildSourceInboundFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceInboundNo) return;
    map.set(row.sourceInboundNo, { value: row.sourceInboundNo, label: row.sourceInboundNo });
  });
  return [{ value: '', label: '全部' }, ...map.values()];
}

/** 新增/编辑页初始表单（字段顺序与 TSV 一致） */
export const defaultReturnForm = {
  id: '',
  returnNo: '保存后自动生成',
  supplier: '',
  currency: '人民币',
  warehouse: '',
  returnDeadline: '',
  sourceInboundNo: '',
  remark: '',
  lines: [
    {
      id: 'return-line-default',
      product: '',
      productCode: '',
      productName: '',
      barcode: '',
      unit: '个',
      sourceInboundLineId: '',
      sourceInboundLine: '',
      quantity: 1,
      price: '',
      taxRate: '',
      receivedQty: 0,
      inTransitQty: 0,
    },
  ],
};

export function getEditableReturn(row) {
  if (!row) return { ...defaultReturnForm, lines: defaultReturnForm.lines.map((line) => ({ ...line })) };
  return {
    ...defaultReturnForm,
    id: row.id || '',
    returnNo: row.returnNo || defaultReturnForm.returnNo,
    supplier: row.supplier || '',
    currency: row.currency || defaultReturnForm.currency,
    warehouse: row.warehouse || '',
    returnDeadline: row.returnDeadline || '',
    sourceInboundNo: row.sourceInboundNo || '',
    remark: row.remark ?? '',
    lines: (row.lines || []).map((line) => ({ ...line })),
  };
}
