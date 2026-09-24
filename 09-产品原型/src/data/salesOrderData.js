import { resolveOptionLabel } from '../lib/codeName.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { enrichOrderLine, normalizeOrderRow } from '../lib/salesOrderLogic.js';
import { currencyOptions, customerOptions, logicalWarehouseOptions } from './masterData.js';

function enrichSampleLine(line) {
  return enrichOrderLine(line);
}

const sampleLines = [
  enrichSampleLine({ id: 'sales-line-1', product: 'SP0101010001', unit: '个', quantity: 100, shipped: 0, notifyQty: 0, pushableQty: 100, price: 128, taxRate: '13' }),
  enrichSampleLine({ id: 'sales-line-2', product: 'SP0101020001', unit: '个', quantity: 50, shipped: 30, notifyQty: 10, pushableQty: 10, price: 169, taxRate: '13' }),
];

const seedOrders = [
  { orderNo: 'XSDD-20260919-0001', date: '2026-09-19', customer: 'CUS000001', warehouse: 'LWH000001', deliveryDate: '2026-10-05', currency: '人民币', amount: 12800, taxAmount: 1470.80, netAmount: 11329.20, shippedQty: 0, auditStatus: 'draft', businessStatus: 'normal', shipStatus: 'not_shipped', remark: '示例销售单', updatedAt: '2026-09-19 10:00:00', lines: sampleLines.slice(0, 1) },
  { orderNo: 'XSDD-20260918-0002', date: '2026-09-18', customer: 'CUS000002', warehouse: 'LWH000002', deliveryDate: '2026-09-30', currency: '人民币', amount: 64000, taxAmount: 7362.83, netAmount: 56637.17, shippedQty: 30, auditStatus: 'approved', businessStatus: 'normal', shipStatus: 'partial', submittedAt: '2026-09-18 14:30:00', submitter: '张三', auditor: '李四', auditTime: '2026-09-18 15:00:00', remark: '', updatedAt: '2026-09-18 16:20:00', lines: sampleLines },
  { orderNo: 'XSDD-20260917-0003', date: '2026-09-17', customer: 'CUS000003', warehouse: 'LWH000003', deliveryDate: '2026-10-01', currency: '人民币', amount: 3390, taxAmount: 389.38, netAmount: 3000.62, shippedQty: 0, auditStatus: 'pending', businessStatus: 'normal', shipStatus: 'not_shipped', submittedAt: '2026-09-17 14:10:00', submitter: '王五', remark: '', updatedAt: '2026-09-17 14:10:00', lines: [enrichSampleLine({ id: 'sales-line-3', product: 'SP0101030001', unit: '件', quantity: 10, shipped: 0, notifyQty: 10, pushableQty: 0, price: 339, taxRate: '13' })] },
  { orderNo: 'XSDD-20260916-0004', date: '2026-09-16', customer: 'CUS000004', warehouse: 'LWH000001', deliveryDate: '2026-09-25', currency: '美元', amount: 9000, taxAmount: 0, netAmount: 9000, shippedQty: 6, auditStatus: 'approved', businessStatus: 'closed', shipStatus: 'completed', submittedAt: '2026-09-16 11:00:00', submitter: '张三', auditor: '李四', auditTime: '2026-09-16 16:00:00', closeType: 'auto', closeReason: '全部发货自动关单', closeTime: '2026-09-20 14:30:00', closeOperator: '系统', remark: '', updatedAt: '2026-09-20 14:30:00', lines: [enrichSampleLine({ id: 'sales-line-4', product: 'SP0102010001', unit: '台', quantity: 6, shipped: 6, notifyQty: 0, pushableQty: 0, price: 1500, taxRate: '0' })] },
  { orderNo: 'XSDD-20260915-0005', date: '2026-09-15', customer: 'CUS000005', warehouse: 'LWH000002', deliveryDate: '2026-09-22', currency: '人民币', amount: 2280, taxAmount: 262.30, netAmount: 2017.70, shippedQty: 0, auditStatus: 'approved', businessStatus: 'cancelled', shipStatus: 'not_shipped', cancelReason: '客户取消订单', cancelTime: '2026-09-16 09:00:00', cancelOperator: '李四', remark: '', updatedAt: '2026-09-16 09:00:00', lines: [enrichSampleLine({ id: 'sales-line-5', product: 'SP0103010001', unit: '个', quantity: 12, shipped: 0, notifyQty: 0, pushableQty: 0, price: 190, taxRate: '13' })] },
  { orderNo: 'XSDD-20260920-0006', date: '2026-09-20', customer: 'CUS000001', warehouse: 'LWH000001', deliveryDate: '2026-10-10', currency: '人民币', amount: 12800, taxAmount: 1470.80, netAmount: 11329.20, shippedQty: 0, auditStatus: 'approved', businessStatus: 'normal', shipStatus: 'not_shipped', remark: '待取消演示单', updatedAt: '2026-09-20 09:00:00', lines: [enrichSampleLine({ id: 'sales-line-6', product: 'SP0101010001', unit: '个', quantity: 100, shipped: 0, notifyQty: 20, pushableQty: 80, price: 128, taxRate: '13' })] },
];

export const salesOrders = seedOrders.map((order, index) => normalizeOrderRow({
  ...order,
  id: `sales-order-${index + 1}`,
  creator: '张三',
  updater: '张三',
  createdAt: order.submittedAt || `${order.date} 09:00:00`,
}));

export const salesOrderStatusLabels = {
  auditStatus: { draft: '草稿', pending: '待审核', approved: '已审核' },
  businessStatus: { normal: '正常', cancelled: '已取消', closed: '已关闭' },
  shipStatus: { not_shipped: '未发货', partial: '部分发货', completed: '全部发货' },
};

const qtyCell = (value) => value ?? 0;

export const salesOrderColumns = [
  { key: 'orderNo', label: '单号', defaultWidth: 180, minWidth: 160, maxWidth: 240, ellipsis: true, link: true },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, customerOptions) },
  { key: 'warehouse', label: '发货仓库', defaultWidth: 160, minWidth: 120, maxWidth: 220, ellipsis: true, render: (value) => resolveOptionLabel(value, logicalWarehouseOptions) },
  { key: 'deliveryDate', label: '交期', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, sortable: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => salesOrderStatusLabels.auditStatus[value] || value, tone: (value) => (value === 'approved' ? 'text-erp-success' : value === 'pending' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'businessStatus', label: '业务状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => salesOrderStatusLabels.businessStatus[value] || value, tone: (value) => (value === 'normal' ? 'text-erp-success' : 'text-erp-danger') },
  { key: 'shipStatus', label: '发货状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => salesOrderStatusLabels.shipStatus[value] || value, tone: (value) => (value === 'completed' ? 'text-erp-success' : value === 'partial' ? 'text-erp-info' : 'text-erp-warning') },
  { key: 'totalOrderQty', label: '总销售数量', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalPushableQty', label: '可下推数量', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'shippedQty', label: '累计实际出库数量', defaultWidth: 128, minWidth: 112, maxWidth: 160, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'currency', label: '币别', defaultWidth: 112, minWidth: 96, maxWidth: 140, ellipsis: true, render: (value) => resolveOptionLabel(value, currencyOptions) },
  { key: 'amount', label: '价税合计', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'taxAmount', label: '税额', defaultWidth: 104, minWidth: 88, maxWidth: 140, ellipsis: true, align: 'right', render: (value) => formatAmount(value) },
  { key: 'netAmount', label: '金额', defaultWidth: 112, minWidth: 96, maxWidth: 160, ellipsis: true, align: 'right', sortable: true, render: (value) => formatAmount(value) },
  { key: 'remark', label: '备注', defaultWidth: 160, minWidth: 120, maxWidth: 240, ellipsis: true, render: (value) => value || EMPTY_PLACEHOLDER },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];
