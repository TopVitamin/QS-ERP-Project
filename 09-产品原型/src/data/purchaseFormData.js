import { productOptions, skuOptions, unitOptions, taxRateOptions } from './masterData.js';
import { orderStatusLabels } from './orderData.js';

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

export const purchaseLineEditorOptions = {
  productOptions,
  skuOptions,
  unitOptions,
  taxRateOptions,
};

export const defaultOrderForm = {
  orderNo: '保存后自动生成',
  date: '2026-09-19',
  supplier: '',
  currency: '人民币',
  warehouse: '',
  deliveryDate: '',
  remark: '',
  lines: [
    { id: 'order-line-1', product: '', productCode: '', productName: '', barcode: '', unit: '个', quantity: 1, received: 0, notifyQty: 0, pushableQty: 0, price: 0, taxRate: '13' },
  ],
};

export function getEditableOrder(row) {
  return {
    ...defaultOrderForm,
    orderNo: row?.orderNo || defaultOrderForm.orderNo,
    date: row?.date || defaultOrderForm.date,
    supplier: row?.supplier || defaultOrderForm.supplier,
    currency: row?.currency || defaultOrderForm.currency,
    warehouse: row?.warehouse || defaultOrderForm.warehouse,
    deliveryDate: row?.deliveryDate || defaultOrderForm.deliveryDate,
    remark: row?.remark ?? defaultOrderForm.remark,
    lines: row?.lines?.map((line) => ({ ...line })) || defaultOrderForm.lines,
  };
}

export function getOrderStatusBadges(row) {
  return [
    { label: orderStatusLabels.auditStatus[row.auditStatus] || '草稿', tone: row.auditStatus === 'approved' ? 'success' : row.auditStatus === 'pending' ? 'info' : 'warning' },
    { label: orderStatusLabels.businessStatus[row.businessStatus] || '正常', tone: row.businessStatus === 'normal' ? 'success' : 'danger' },
    { label: orderStatusLabels.receiveStatus[row.receiveStatus] || '未收货', tone: row.receiveStatus === 'completed' ? 'success' : row.receiveStatus === 'partial' ? 'info' : 'warning' },
  ];
}

export function sumReceivedQty(lines = []) {
  return lines.reduce((sum, line) => sum + Number(line.received || 0), 0);
}
