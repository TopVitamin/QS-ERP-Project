import { format, isValid, parseISO } from 'date-fns';

export const supplierOptions = [
  { value: '供应商10086', label: '供应商10086' },
  { value: '土豆供应商', label: '土豆供应商' },
  { value: '测试', label: '测试' },
  { value: '中南批发商行', label: '中南批发商行' },
  { value: '我是赠品2', label: '我是赠品2' },
  { value: '订货散客', label: '订货散客' },
  { value: '甲', label: '甲' },
];

export const warehouseOptions = [
  { value: '一号仓', label: '一号仓' },
  { value: '二号仓', label: '二号仓' },
  { value: '三号仓', label: '三号仓' },
];

export const employeeOptions = [
  { value: '陈小梦CXM', label: '陈小梦CXM' },
  { value: '李明', label: '李明' },
  { value: '王芳', label: '王芳' },
  { value: '张廷ZT', label: '张廷ZT' },
  { value: '韩佩奇HPQ', label: '韩佩奇HPQ' },
  { value: '李思乾LSQ', label: '李思乾LSQ' },
];

export const departmentOptions = [
  { value: '工程一部', label: '工程一部' },
  { value: '工程二部', label: '工程二部' },
  { value: '工程四部', label: '工程四部' },
];

export const productOptions = [
  { value: 'SKU-1001', label: '无线键盘 K380' },
  { value: 'SKU-1002', label: '人体工学鼠标 M720' },
  { value: 'SKU-1003', label: 'USB-C 多功能扩展坞' },
  { value: 'SKU-1004', label: '27 英寸办公显示器' },
  { value: 'SKU-1005', label: '双肩电脑背包 15.6"' },
];

export const unitOptions = [
  { value: '个', label: '个' },
  { value: '件', label: '件' },
  { value: '箱', label: '箱' },
];

export const taxRateOptions = [
  { value: '0', label: '0%' },
  { value: '6', label: '6%' },
  { value: '9', label: '9%' },
  { value: '13', label: '13%' },
];

export const paymentTermOptions = [
  { value: '现款', label: '现款' },
  { value: '30天', label: '30天' },
  { value: '45天', label: '45天' },
  { value: '60天', label: '60天' },
];

export const defaultOrderForm = {
  orderNo: '保存后自动生成',
  date: '2026-08-19',
  mode: '普通采购',
  supplier: '测试',
  settleSupplier: '测试',
  settlePeriod: '45天',
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
  operator: '陈小梦CXM',
  status: '待入库',
  remark: '',
  lines: [
    { id: 'inbound-line-1', product: 'SKU-1001', spec: '蓝牙 / 便携版', unit: '个', orderQuantity: 20, quantity: 20, price: 120, remark: '' },
    { id: 'inbound-line-2', product: 'SKU-1002', spec: '黑色 / 无线版', unit: '个', orderQuantity: 12, quantity: 8, price: 159, remark: '' },
  ],
};

export function parseFormDate(value) {
  if (!value) return undefined;
  const parsed = value instanceof Date ? value : parseISO(value);
  return isValid(parsed) ? parsed : undefined;
}

export function formatFormDate(value) {
  return value && isValid(value) ? format(value, 'yyyy-MM-dd') : '';
}

export function getEditableOrder(row) {
  return {
    ...defaultOrderForm,
    orderNo: row?.orderNo || defaultOrderForm.orderNo,
    date: row?.date || defaultOrderForm.date,
    mode: row?.mode || defaultOrderForm.mode,
    supplier: row?.supplier || defaultOrderForm.supplier,
    settleSupplier: row?.settleSupplier || row?.supplier || defaultOrderForm.settleSupplier,
    settlePeriod: row?.settlePeriod || defaultOrderForm.settlePeriod,
    salesman: row?.salesman || defaultOrderForm.salesman,
    department: row?.department || defaultOrderForm.department,
    status: row?.auditStatus === 'approved' ? '已审核' : '未审核',
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
    operator: row?.operator || defaultInboundForm.operator,
    status: row?.status === 'completed' ? '已入库' : row?.status === 'partial' ? '部分入库' : '待入库',
  };
}
