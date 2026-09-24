import {
  addressRecordToCnAddress,
  createEmptyCnAddress,
  getDefaultCustomerAddress,
  normalizeAddressValue,
} from '../lib/cnAddress.js';
import { productOptions, skuOptions, unitOptions } from './masterData.js';
import { salesOrderStatusLabels } from './salesOrderData.js';

export const salesLineEditorOptions = {
  productOptions,
  skuOptions,
  unitOptions,
  taxRateControl: 'number',
  showReferencePrice: false,
};

export const defaultSalesOrderForm = {
  orderNo: '保存后自动生成',
  customer: '',
  currency: '人民币',
  warehouse: '',
  deliveryDate: '',
  shipMethod: 'logistics',
  deliveryAddress: createEmptyCnAddress(),
  logisticsProduct: '',
  remark: '',
  lines: [
    { id: 'sales-line-1', product: '', productCode: '', productName: '', barcode: '', unit: '个', quantity: 1, shipped: 0, notifyQty: 0, pushableQty: 0, price: '', taxRate: '' },
  ],
};

export function getEditableSalesOrder(row) {
  return {
    ...defaultSalesOrderForm,
    orderNo: row?.orderNo || defaultSalesOrderForm.orderNo,
    customer: row?.customer || defaultSalesOrderForm.customer,
    currency: row?.currency || defaultSalesOrderForm.currency,
    warehouse: row?.warehouse || defaultSalesOrderForm.warehouse,
    deliveryDate: row?.deliveryDate || defaultSalesOrderForm.deliveryDate,
    shipMethod: row?.shipMethod || defaultSalesOrderForm.shipMethod,
    deliveryAddress: row?.deliveryAddress
      ? normalizeAddressValue(row.deliveryAddress)
      : addressRecordToCnAddress(getDefaultCustomerAddress(row?.customer)),
    logisticsProduct: row?.logisticsProduct || defaultSalesOrderForm.logisticsProduct,
    remark: row?.remark ?? defaultSalesOrderForm.remark,
    lines: row?.lines?.map((line) => ({ ...line })) || defaultSalesOrderForm.lines,
  };
}

export function getSalesOrderStatusBadges(row) {
  return [
    { label: salesOrderStatusLabels.auditStatus[row.auditStatus] || '草稿', tone: row.auditStatus === 'approved' ? 'success' : row.auditStatus === 'pending' ? 'info' : 'warning' },
    { label: salesOrderStatusLabels.businessStatus[row.businessStatus] || '正常', tone: row.businessStatus === 'normal' ? 'success' : 'danger' },
    { label: salesOrderStatusLabels.shipStatus[row.shipStatus] || '未发货', tone: row.shipStatus === 'completed' ? 'success' : row.shipStatus === 'partial' ? 'info' : 'warning' },
  ];
}
