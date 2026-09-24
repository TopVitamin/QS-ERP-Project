import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { enrichOrderLine, normalizeOrderRow } from '../lib/purchaseOrderLogic.js';
import { currencyOptions, supplierOptions } from './masterData.js';
import { getInventoryLogicalWarehouseOptions } from './warehouseData.js';
import { formatSnapshotCodeName } from '../lib/documentNameSnapshots.js';

function enrichSampleLine(line) {
  return enrichOrderLine(line);
}

const sampleLines = [
  enrichSampleLine({ id: 'order-line-1', product: 'SP0101010001', unit: '个', quantity: 100, received: 0, notifyQty: 0, pushableQty: 100, price: 113, taxRate: '13' }),
  enrichSampleLine({ id: 'order-line-2', product: 'SP0101020001', unit: '个', quantity: 50, received: 19, notifyQty: 10, pushableQty: 21, price: 159, taxRate: '13' }),
];

const seedOrders = [
  { orderNo: 'CGDD-20260919-0001', supplier: 'SUP000001', warehouse: 'LWH000001', deliveryDate: '2026-10-05', currency: '人民币', amount: 11300, taxAmount: 1299.12, netAmount: 10000.88, receivedQty: 0, auditStatus: 'draft', businessStatus: 'normal', receiveStatus: 'not_received', remark: '示例补货单', createdAt: '2026-09-19 09:00:00', updatedAt: '2026-09-19 10:00:00', lines: sampleLines.slice(0, 1) },
  { orderNo: 'CGDD-20260918-0002', supplier: 'SUP000002', warehouse: 'LWH000002', deliveryDate: '2026-09-30', currency: '人民币', amount: 56500, taxAmount: 6491.15, netAmount: 50008.85, receivedQty: 30, auditStatus: 'approved', businessStatus: 'normal', receiveStatus: 'partial', submittedAt: '2026-09-18 14:30:00', submitter: '张三', auditor: '李四', auditTime: '2026-09-18 15:00:00', remark: '', createdAt: '2026-09-18 14:30:00', updatedAt: '2026-09-18 16:20:00', lines: sampleLines },
  { orderNo: 'CGDD-20260917-0003', supplier: 'SUP000003', warehouse: 'LWH000003', deliveryDate: '2026-10-01', currency: '人民币', amount: 3390, taxAmount: 389.38, netAmount: 3000.62, receivedQty: 0, auditStatus: 'pending', businessStatus: 'normal', receiveStatus: 'not_received', submittedAt: '2026-09-17 14:10:00', submitter: '王五', remark: '', createdAt: '2026-09-17 14:10:00', updatedAt: '2026-09-17 14:10:00', lines: [enrichSampleLine({ id: 'order-line-3', product: 'SP0101030001', unit: '件', quantity: 10, received: 0, notifyQty: 10, pushableQty: 0, price: 339, taxRate: '13' })] },
  { orderNo: 'CGDD-20260916-0004', supplier: 'SUP000004', warehouse: 'LWH000001', deliveryDate: '2026-09-25', currency: '人民币', amount: 9000, taxAmount: 1035.40, netAmount: 7964.60, receivedQty: 6, auditStatus: 'approved', businessStatus: 'closed', receiveStatus: 'completed', submittedAt: '2026-09-16 11:00:00', submitter: '张三', auditor: '李四', auditTime: '2026-09-16 16:00:00', closeType: 'manual', closeReason: '供应商无法继续供货', closeTime: '2026-09-20 14:30:00', closeOperator: '张三', remark: '', createdAt: '2026-09-16 11:00:00', updatedAt: '2026-09-20 14:30:00', lines: [enrichSampleLine({ id: 'order-line-4', product: 'SP0102010001', unit: '台', quantity: 6, received: 6, notifyQty: 0, pushableQty: 0, price: 1500, taxRate: '13' })] },
  { orderNo: 'CGDD-20260915-0005', supplier: 'SUP000005', warehouse: 'LWH000002', deliveryDate: '2026-09-22', currency: '人民币', amount: 2280, taxAmount: 262.30, netAmount: 2017.70, receivedQty: 0, auditStatus: 'approved', businessStatus: 'cancelled', receiveStatus: 'not_received', cancelReason: '客户取消采购', cancelTime: '2026-09-16 09:00:00', cancelOperator: '李四', remark: '', createdAt: '2026-09-15 09:00:00', updatedAt: '2026-09-16 09:00:00', lines: [enrichSampleLine({ id: 'order-line-5', product: 'SP0103010001', unit: '个', quantity: 12, received: 0, notifyQty: 0, pushableQty: 0, price: 190, taxRate: '13' })] },
  { orderNo: 'CGDD-20260920-0006', supplier: 'SUP000001', warehouse: 'LWH000001', deliveryDate: '2026-10-10', currency: '人民币', amount: 11300, taxAmount: 1299.12, netAmount: 10000.88, receivedQty: 0, auditStatus: 'approved', businessStatus: 'normal', receiveStatus: 'not_received', remark: '待取消演示单', createdAt: '2026-09-20 08:30:00', updatedAt: '2026-09-20 09:00:00', lines: [enrichSampleLine({ id: 'order-line-6', product: 'SP0101010001', unit: '个', quantity: 100, received: 0, notifyQty: 20, pushableQty: 80, price: 113, taxRate: '13' })] },
  { orderNo: 'CGDD-20260921-0007', supplier: 'SUP000001', warehouse: 'LWH000001', deliveryDate: '2026-10-12', currency: '人民币', auditStatus: 'draft', businessStatus: 'normal', createdAt: '2026-09-21 09:00:00', updatedAt: '2026-09-21 09:00:00', lines: [enrichSampleLine({ id: 'order-line-7', product: 'SP0101030001', unit: '件', quantity: 8, received: 0, notifyQty: 0, price: 339, taxRate: '13' })] },
  { orderNo: 'CGDD-20260921-0008', supplier: 'SUP000002', warehouse: 'LWH000001', deliveryDate: '2026-10-13', currency: '人民币', auditStatus: 'pending', businessStatus: 'normal', submittedAt: '2026-09-21 09:20:00', submitter: '王五', createdAt: '2026-09-21 09:20:00', updatedAt: '2026-09-21 09:20:00', lines: [enrichSampleLine({ id: 'order-line-8', product: 'SP0102020001', unit: '台', quantity: 3, received: 0, notifyQty: 0, price: 1299, taxRate: '13' })] },
  { orderNo: 'CGDD-20260921-0009', supplier: 'SUP000002', warehouse: 'LWH000002', deliveryDate: '2026-10-14', currency: '人民币', auditStatus: 'approved', businessStatus: 'normal', createdAt: '2026-09-21 09:40:00', updatedAt: '2026-09-21 09:40:00', lines: [enrichSampleLine({ id: 'order-line-9', product: 'SP0101010001', unit: '个', quantity: 30, received: 7, notifyQty: 0, price: 113, taxRate: '13' })] },
  { orderNo: 'CGDD-20260921-0010', supplier: 'SUP000003', warehouse: 'LWH000003', deliveryDate: '2026-10-15', currency: '美元', auditStatus: 'approved', businessStatus: 'normal', createdAt: '2026-09-21 10:00:00', updatedAt: '2026-09-21 10:00:00', lines: [enrichSampleLine({ id: 'order-line-10', product: 'SP0101020001', unit: '个', quantity: 20, received: 7, notifyQty: 0, price: 159, taxRate: '0' })] },
];

export const orders = seedOrders.map((order, index) => normalizeOrderRow({
  ...order,
  id: `order-${index + 1}`,
  creator: '张三',
  updater: '张三',
  createdAt: order.createdAt || order.submittedAt || order.updatedAt,
}));

export const orderStatusLabels = {
  auditStatus: { draft: '草稿', pending: '待审核', approved: '已审核' },
  businessStatus: { normal: '正常', cancelled: '已取消', closed: '已关闭' },
  receiveStatus: { not_received: '未收货', partial: '部分收货', completed: '全部收货' },
};

const qtyCell = (value) => value ?? 0;

export const tableColumns = [
  { key: 'orderNo', label: '单号', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'supplier', label: '供应商', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value, row) => formatSnapshotCodeName(value, row?.supplierNameSnapshot) },
  { key: 'warehouse', label: '收货仓库', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, render: (value, row) => formatSnapshotCodeName(value, row?.warehouseNameSnapshot) },
  { key: 'deliveryDate', label: '承诺交期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => orderStatusLabels.auditStatus[value] || value, tone: (value) => (value === 'approved' ? 'text-erp-success' : value === 'pending' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'businessStatus', label: '业务状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => orderStatusLabels.businessStatus[value] || value, tone: (value) => (value === 'normal' ? 'text-erp-success' : 'text-erp-danger') },
  { key: 'receiveStatus', label: '收货状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => orderStatusLabels.receiveStatus[value] || value, tone: (value) => (value === 'completed' ? 'text-erp-success' : value === 'partial' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'totalOrderQty', label: '总采购数量', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalPushableQty', label: '可下推数量', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'receivedQty', label: '累计入库数量', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'amount', label: '价税合计', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'netAmount', label: '金额', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'remark', label: '备注', defaultWidth: 160, minWidth: 120, maxWidth: 240, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true }, // 列表默认按创建时间倒序
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];
