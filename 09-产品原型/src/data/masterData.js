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

export const currencyOptions = [
  { value: '人民币', label: '人民币' },
  { value: '美元', label: '美元' },
  { value: '欧元', label: '欧元' },
  { value: '港币', label: '港币' },
];
