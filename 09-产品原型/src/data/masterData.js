import { buildMasterOption } from '../lib/codeName.js';

export const customerOptions = [
  buildMasterOption({ code: 'CUS000001', name: '示例客户有限公司', defaultCurrency: '人民币' }),
  buildMasterOption({ code: 'CUS000002', name: '华东连锁商贸', defaultCurrency: '人民币' }),
  buildMasterOption({ code: 'CUS000003', name: '深圳科技经销', defaultCurrency: '人民币' }),
  buildMasterOption({ code: 'CUS000004', name: '海外经销客户A', defaultCurrency: '美元' }),
  buildMasterOption({ code: 'CUS000005', name: '零售散客渠道', defaultCurrency: '人民币' }),
];

export const logicalWarehouseOptions = [
  buildMasterOption({ code: 'LWH000001', name: '深圳仓' }),
  buildMasterOption({ code: 'LWH000002', name: '上海仓' }),
  buildMasterOption({ code: 'LWH000003', name: '北京仓' }),
];

export const customerAddressOptions = [
  {
    value: 'addr-cus1-default',
    customer: 'CUS000001',
    isDefault: true,
    provinceCode: '44',
    cityCode: '4403',
    districtCode: '440305',
    detailAddress: '科技园南路 88 号',
  },
  {
    value: 'addr-cus1-branch',
    customer: 'CUS000001',
    isDefault: false,
    provinceCode: '44',
    cityCode: '4401',
    districtCode: '440106',
    detailAddress: '体育西路 66 号',
  },
  {
    value: 'addr-cus2-default',
    customer: 'CUS000002',
    isDefault: true,
    provinceCode: '31',
    cityCode: '3101',
    districtCode: '310115',
    detailAddress: '张江路 100 号',
  },
  {
    value: 'addr-cus3-default',
    customer: 'CUS000003',
    isDefault: true,
    provinceCode: '11',
    cityCode: '1101',
    districtCode: '110105',
    detailAddress: '望京街 18 号',
  },
  {
    value: 'addr-cus4-default',
    customer: 'CUS000004',
    isDefault: true,
    provinceCode: '44',
    cityCode: '4403',
    districtCode: '440306',
    detailAddress: '福永街道物流园 4 号库',
  },
  {
    value: 'addr-cus5-default',
    customer: 'CUS000005',
    isDefault: true,
    provinceCode: '35',
    cityCode: '3502',
    districtCode: '350206',
    detailAddress: '软件园二期',
  },
];

export const logisticsProductOptions = [
  { value: 'LSP000001', label: 'LSP000001 顺丰标快' },
  { value: 'LSP000002', label: 'LSP000002 德邦大件' },
  { value: 'LSP000003', label: 'LSP000003 中通经济' },
  { value: 'warehouse-assign', label: '由仓库指定' },
];

export const supplierOptions = [
  buildMasterOption({ code: 'SUP000001', name: '测试' }),
  buildMasterOption({ code: 'SUP000002', name: '土豆供应商' }),
  buildMasterOption({ code: 'SUP000003', name: '中南批发商行', defaultCurrency: '美元' }),
  buildMasterOption({ code: 'SUP000004', name: '供应商10086' }),
  buildMasterOption({ code: 'SUP000005', name: '订货散客' }),
  buildMasterOption({ code: 'SUP000006', name: '我是赠品2' }),
  buildMasterOption({ code: 'SUP000007', name: '甲' }),
];

export const warehouseOptions = [
  buildMasterOption({ code: 'WH000001', name: '一号仓' }),
  buildMasterOption({ code: 'WH000002', name: '二号仓' }),
  buildMasterOption({ code: 'WH000003', name: '三号仓' }),
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
  { value: 'SP0101010001', label: '无线键盘 K380', skuCode: 'SP0101010001', productName: '无线键盘 K380', spec: '蓝牙 / 便携版', barcode: '6901001001', unit: '个', availableStock: 120, referencePrice: 120 },
  { value: 'SP0101020001', label: '人体工学鼠标 M720', skuCode: 'SP0101020001', productName: '人体工学鼠标 M720', spec: '黑色 / 无线版', barcode: '6901001002', unit: '个', availableStock: 80, referencePrice: 159 },
  { value: 'SP0101030001', label: 'USB-C 多功能扩展坞', skuCode: 'SP0101030001', productName: 'USB-C 多功能扩展坞', spec: '深空灰 / 8 合 1', barcode: '6901001003', unit: '件', availableStock: 36, referencePrice: 339 },
  { value: 'SP0102010001', label: '27 英寸办公显示器', skuCode: 'SP0102010001', productName: '27 英寸办公显示器', spec: '黑色 / 4K', barcode: '6901001004', unit: '台', availableStock: 24, referencePrice: 1299 },
  { value: 'SP0103010001', label: '双肩电脑背包 15.6"', skuCode: 'SP0103010001', productName: '双肩电脑背包 15.6"', spec: '深灰 / 防泼水', barcode: '6901001005', unit: '个', availableStock: 65, referencePrice: 189 },
  { value: 'SP0101010002', label: '无线键盘 K380', skuCode: 'SP0101010002', productName: '无线键盘 K380', spec: '米白 / 便携版', barcode: '6901001006', unit: '个', availableStock: 48, referencePrice: 125 },
  { value: 'SP0101020002', label: '人体工学鼠标 M720', skuCode: 'SP0101020002', productName: '人体工学鼠标 M720', spec: '灰色 / 静音版', barcode: '6901001007', unit: '个', availableStock: 52, referencePrice: 165 },
  { value: 'SP0101030002', label: 'USB-C 多功能扩展坞', skuCode: 'SP0101030002', productName: 'USB-C 多功能扩展坞', spec: '银色 / 6 合 1', barcode: '6901001008', unit: '件', availableStock: 29, referencePrice: 259 },
  { value: 'SP0102020001', label: '桌面显示器支架', skuCode: 'SP0102020001', productName: '桌面显示器支架', spec: '铝合金 / 单臂', barcode: '6901001009', unit: '个', availableStock: 18, referencePrice: 299 },
  { value: 'SP0102020002', label: '桌面显示器支架', skuCode: 'SP0102020002', productName: '桌面显示器支架', spec: '铝合金 / 双臂', barcode: '6901001010', unit: '个', availableStock: 11, referencePrice: 489 },
  { value: 'SP0103030001', label: '办公桌面插座', skuCode: 'SP0103030001', productName: '办公桌面插座', spec: '3孔 / USB-C', barcode: '6901001011', unit: '个', availableStock: 74, referencePrice: 99 },
  { value: 'SP0103030002', label: '办公桌面插座', skuCode: 'SP0103030002', productName: '办公桌面插座', spec: '5孔 / USB-A', barcode: '6901001012', unit: '个', availableStock: 58, referencePrice: 89 },
  { value: 'SP0103020001', label: '超五类网线', skuCode: 'SP0103020001', productName: '超五类网线', spec: '蓝色 / 3米', barcode: '6901001013', unit: '条', availableStock: 210, referencePrice: 18 },
  { value: 'SP0103020002', label: '超五类网线', skuCode: 'SP0103020002', productName: '超五类网线', spec: '蓝色 / 5米', barcode: '6901001014', unit: '条', availableStock: 160, referencePrice: 25 },
  { value: 'SP0102020003', label: '笔记本电脑支架', skuCode: 'SP0102020003', productName: '笔记本电脑支架', spec: '银色 / 折叠款', barcode: '6901001015', unit: '个', availableStock: 42, referencePrice: 129 },
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
  { value: '人民币', code: 'CNY', name: '人民币', label: 'CNY 人民币' },
  { value: '美元', code: 'USD', name: '美元', label: 'USD 美元' },
  { value: '欧元', code: 'EUR', name: '欧元', label: 'EUR 欧元' },
  { value: '港币', code: 'HKD', name: '港币', label: 'HKD 港币' },
];
