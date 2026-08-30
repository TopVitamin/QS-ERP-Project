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

export const skuOptions = [
  { value: 'SKU-1001', label: '无线键盘 K380', skuCode: 'SKU-1001', productName: '无线键盘 K380', spec: '蓝牙 / 便携版', barcode: '6901001001', unit: '个', availableStock: 120, referencePrice: 120 },
  { value: 'SKU-1002', label: '人体工学鼠标 M720', skuCode: 'SKU-1002', productName: '人体工学鼠标 M720', spec: '黑色 / 无线版', barcode: '6901001002', unit: '个', availableStock: 80, referencePrice: 159 },
  { value: 'SKU-1003', label: 'USB-C 多功能扩展坞', skuCode: 'SKU-1003', productName: 'USB-C 多功能扩展坞', spec: '深空灰 / 8 合 1', barcode: '6901001003', unit: '件', availableStock: 36, referencePrice: 339 },
  { value: 'SKU-1004', label: '27 英寸办公显示器', skuCode: 'SKU-1004', productName: '27 英寸办公显示器', spec: '黑色 / 4K', barcode: '6901001004', unit: '台', availableStock: 24, referencePrice: 1299 },
  { value: 'SKU-1005', label: '双肩电脑背包 15.6"', skuCode: 'SKU-1005', productName: '双肩电脑背包 15.6"', spec: '深灰 / 防泼水', barcode: '6901001005', unit: '个', availableStock: 65, referencePrice: 189 },
  { value: 'SKU-1006', label: '无线键盘 K380', skuCode: 'SKU-1006', productName: '无线键盘 K380', spec: '米白 / 便携版', barcode: '6901001006', unit: '个', availableStock: 48, referencePrice: 125 },
  { value: 'SKU-1007', label: '人体工学鼠标 M720', skuCode: 'SKU-1007', productName: '人体工学鼠标 M720', spec: '灰色 / 静音版', barcode: '6901001007', unit: '个', availableStock: 52, referencePrice: 165 },
  { value: 'SKU-1008', label: 'USB-C 多功能扩展坞', skuCode: 'SKU-1008', productName: 'USB-C 多功能扩展坞', spec: '银色 / 6 合 1', barcode: '6901001008', unit: '件', availableStock: 29, referencePrice: 259 },
  { value: 'SKU-1009', label: '桌面显示器支架', skuCode: 'SKU-1009', productName: '桌面显示器支架', spec: '铝合金 / 单臂', barcode: '6901001009', unit: '个', availableStock: 18, referencePrice: 299 },
  { value: 'SKU-1010', label: '桌面显示器支架', skuCode: 'SKU-1010', productName: '桌面显示器支架', spec: '铝合金 / 双臂', barcode: '6901001010', unit: '个', availableStock: 11, referencePrice: 489 },
  { value: 'SKU-1011', label: '办公桌面插座', skuCode: 'SKU-1011', productName: '办公桌面插座', spec: '3孔 / USB-C', barcode: '6901001011', unit: '个', availableStock: 74, referencePrice: 99 },
  { value: 'SKU-1012', label: '办公桌面插座', skuCode: 'SKU-1012', productName: '办公桌面插座', spec: '5孔 / USB-A', barcode: '6901001012', unit: '个', availableStock: 58, referencePrice: 89 },
  { value: 'SKU-1013', label: '超五类网线', skuCode: 'SKU-1013', productName: '超五类网线', spec: '蓝色 / 3米', barcode: '6901001013', unit: '条', availableStock: 210, referencePrice: 18 },
  { value: 'SKU-1014', label: '超五类网线', skuCode: 'SKU-1014', productName: '超五类网线', spec: '蓝色 / 5米', barcode: '6901001014', unit: '条', availableStock: 160, referencePrice: 25 },
  { value: 'SKU-1015', label: '笔记本电脑支架', skuCode: 'SKU-1015', productName: '笔记本电脑支架', spec: '银色 / 折叠款', barcode: '6901001015', unit: '个', availableStock: 42, referencePrice: 129 },
];

export const productOptions = skuOptions.map(({ value, label }) => ({ value, label }));

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

export const purchaseLineEditorOptions = {
  productOptions,
  skuOptions,
  unitOptions,
  taxRateOptions,
};

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
    operator: row?.operator || defaultInboundForm.operator,
    status: row?.status === 'completed' ? '已入库' : row?.status === 'partial' ? '部分入库' : '待入库',
    remark: row?.remark ?? defaultInboundForm.remark,
    lines: row?.lines?.map((line) => ({ ...line })) || defaultInboundForm.lines,
  };
}
