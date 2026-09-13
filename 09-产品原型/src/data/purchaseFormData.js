import { productOptions, skuOptions, unitOptions, taxRateOptions } from './masterData.js';

export const paymentTermOptions = [
  { value: '现款', label: '现款' },
  { value: '30天', label: '30天' },
  { value: '45天', label: '45天' },
  { value: '60天', label: '60天' },
];

export const purchaseModeOptions = [
  { value: '普通采购', label: '普通采购' },
  { value: '委外采购', label: '委外采购' },
];

export const inboundTypeOptions = [
  { value: '采购入库', label: '采购入库' },
  { value: '退货入库', label: '退货入库' },
  { value: '其他入库', label: '其他入库' },
];

export const purchaseLineEditorOptions = {
  productOptions,
  skuOptions,
  unitOptions,
  taxRateOptions,
};

export const defaultOrderForm = {
  orderNo: '保存后自动生成',
  date: '2026-08-19',
  mode: '普通采购',
  supplier: '测试',
  settleSupplier: '测试',
  settlePeriod: '45天',
  currency: '人民币',
  salesman: '韩佩奇HPQ',
  department: '工程四部',
  deliveryDate: '2026-08-26',
  status: '未审核',
  remark: '',
  lines: [
    { id: 'order-line-1', product: 'SKU-1001', spec: '蓝牙 / 便携版', unit: '个', quantity: 20, received: 0, price: 120, taxRate: '13', remark: '' },
    { id: 'order-line-2', product: 'SKU-1002', spec: '黑色 / 无线版', unit: '个', quantity: 12, received: 0, price: 159, taxRate: '13', remark: '' },
    { id: 'order-line-3', product: 'SKU-1003', spec: '深空灰 / 8 合 1', unit: '件', quantity: 6, received: 0, price: 339, taxRate: '13', remark: '' },
  ],
};

export const defaultInboundForm = {
  inboundNo: '保存后自动生成',
  date: '2026-08-19',
  inboundType: '采购入库',
  relatedOrderNo: 'CGDD-20260818-00045',
  supplier: '测试',
  warehouse: '一号仓',
  currency: '人民币',
  operator: '陈小梦CXM',
  status: '待入库',
  remark: '',
  lines: [
    { id: 'inbound-line-1', product: 'SKU-1001', spec: '蓝牙 / 便携版', unit: '个', orderQuantity: 20, quantity: 20, price: 120, remark: '' },
    { id: 'inbound-line-2', product: 'SKU-1002', spec: '黑色 / 无线版', unit: '个', orderQuantity: 12, quantity: 8, price: 159, remark: '' },
  ],
};

export function getEditableOrder(row) {
  return {
    ...defaultOrderForm,
    orderNo: row?.orderNo || defaultOrderForm.orderNo,
    date: row?.date || defaultOrderForm.date,
    mode: row?.mode || defaultOrderForm.mode,
    supplier: row?.supplier || defaultOrderForm.supplier,
    settleSupplier: row?.settleSupplier || row?.supplier || defaultOrderForm.settleSupplier,
    settlePeriod: row?.settlePeriod || defaultOrderForm.settlePeriod,
    currency: row?.currency || defaultOrderForm.currency,
    salesman: row?.salesman || defaultOrderForm.salesman,
    department: row?.department || defaultOrderForm.department,
    status: row?.auditStatus === 'approved' ? '已审核' : '未审核',
    remark: row?.remark ?? defaultOrderForm.remark,
    deliveryDate: row?.deliveryDate ?? defaultOrderForm.deliveryDate,
    lines: row?.lines?.map((line) => ({ ...line })) || defaultOrderForm.lines,
  };
}

export function getEditableInbound(row) {
  return {
    ...defaultInboundForm,
    inboundNo: row?.inboundNo || defaultInboundForm.inboundNo,
    date: row?.date || defaultInboundForm.date,
    relatedOrderNo: row?.relatedOrderNo || defaultInboundForm.relatedOrderNo,
    supplier: row?.supplier || defaultInboundForm.supplier,
    warehouse: row?.warehouse || defaultInboundForm.warehouse,
    currency: row?.currency || defaultInboundForm.currency,
    operator: row?.operator || defaultInboundForm.operator,
    status: row?.status === 'completed' ? '已入库' : row?.status === 'partial' ? '部分入库' : '待入库',
    remark: row?.remark ?? defaultInboundForm.remark,
    lines: row?.lines?.map((line) => ({ ...line })) || defaultInboundForm.lines,
  };
}
