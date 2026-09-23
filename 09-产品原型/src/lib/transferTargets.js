import { inboundOrders } from '../data/inboundData.js';
import { auditStatusLabels, INBOUND_STORAGE_KEY, kingdeePushStatusLabels } from '../lib/inboundLogic.js';
import { orderStatusLabels, orders } from '../data/orderData.js';
import { receiptNotices } from '../data/receiptNoticeData.js';
import { salesOrders, salesOrderStatusLabels } from '../data/salesOrderData.js';
import { salesDeliveryNotices } from '../data/salesDeliveryNoticeData.js';
import { salesOutbounds } from '../data/salesOutboundData.js';
import { noticeStatusLabels, receiptModeLabels } from './receiptNoticeLogic.js';
import { deliveryModeLabels, noticeStatusLabels as salesNoticeStatusLabels } from './salesDeliveryNoticeLogic.js';
import { SALES_ORDER_STORAGE_KEY } from './salesOrderLogic.js';
import { DELIVERY_NOTICE_STORAGE_KEY } from './salesDeliveryNoticeLogic.js';
import { SALES_OUTBOUND_STORAGE_KEY, sourceTypeLabels } from './salesOutboundLogic.js';
import { customers, CUSTOMER_STORAGE_KEY } from '../data/customerData.js';
import { products, PRODUCT_STORAGE_KEY } from '../data/productData.js';
import { carriers, logisticsProducts, CARRIER_STORAGE_KEY, PRODUCT_STORAGE_KEY as LOGISTICS_PRODUCT_STORAGE_KEY } from '../data/logisticsData.js';
import { auxiliaryItems, AUXILIARY_STORAGE_KEY } from '../data/auxiliaryData.js';
import { auxiliaryTypeLabels } from './auxiliaryLogic.js';
import { transportTypeLabels } from './logisticsLogic.js';
import { suppliers, SUPPLIER_STORAGE_KEY } from '../data/supplierData.js';
import { lifecycleStatusLabels, salesLevelLabels } from './productLogic.js';
import { logicalWarehouses, warehouseStatusLabels, warehouses } from '../data/warehouseData.js';
import { LOGICAL_STORAGE_KEY, PHYSICAL_STORAGE_KEY, stockStatusLabels } from './warehouseLogic.js';
import { auditLabels } from './partnerMasterLogic.js';
import { EMPTY_PLACEHOLDER } from './format.js';
import { readMockRows } from './mockStorage.js';

function toOptions(labels) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

const warehouseFields = [
  { key: 'code', label: '实体仓编码', required: true, example: 'WH000008' },
  { key: 'name', label: '实体仓名称', required: true, example: '深圳仓二分部' },
  { key: 'operationType', label: '运营类型', options: [{ value: '自营', label: '自营' }, { value: '第三方', label: '第三方' }] },
  { key: 'dockingType', label: '对接方式', options: [{ value: '直连', label: '直连' }, { value: 'SaaS中转', label: 'SaaS中转' }] },
  { key: 'dockingSystem', label: '对接系统', options: [{ value: '仓库作业系统', label: '仓库作业系统' }, { value: '聚水潭', label: '聚水潭' }, { value: '领星', label: '领星' }] },
  { key: 'address', label: '仓库地址', example: '广东省深圳市宝安区福永街道物流园 4 号库' },
  { key: 'contact', label: '联系人', example: '阿盛' },
  { key: 'phone', label: '联系电话', example: '0755-8888 3202' },
  { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
  { key: 'auditStatus', label: '审核状态', importable: false, options: toOptions(warehouseStatusLabels) },
  { key: 'updatedAt', label: '最后更新时间', importable: false },
];

const purchaseOrderFields = [
  { key: 'orderNo', label: '单号' },
  { key: 'date', label: '单据日期' },
  { key: 'supplier', label: '供应商' },
  { key: 'warehouse', label: '收货仓库' },
  { key: 'deliveryDate', label: '承诺交期' },
  { key: 'currency', label: '币别' },
  { key: 'amount', label: '价税合计' },
  { key: 'taxAmount', label: '税额' },
  { key: 'netAmount', label: '金额' },
  { key: 'receivedQty', label: '累计入库' },
  { key: 'remark', label: '备注' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(orderStatusLabels.auditStatus) },
  { key: 'businessStatus', label: '业务状态', options: toOptions(orderStatusLabels.businessStatus) },
  { key: 'receiveStatus', label: '收货状态', options: toOptions(orderStatusLabels.receiveStatus) },
  { key: 'updatedAt', label: '最后更新时间' },
];

const purchaseReceiptNoticeFields = [
  { key: 'noticeNo', label: '单号' },
  { key: 'sourceOrderNo', label: '来源采购订单' },
  { key: 'supplier', label: '供应商' },
  { key: 'warehouse', label: '收货仓库' },
  { key: 'receiptMode', label: '收货处理方式', options: toOptions(receiptModeLabels) },
  { key: 'status', label: '单据状态', options: toOptions(noticeStatusLabels) },
  { key: 'totalNotifyQty', label: '通知数量' },
  { key: 'totalReceivedQty', label: '实收数量' },
  { key: 'totalShortQty', label: '缺收数量' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const purchaseInboundFields = [
  { key: 'inboundNo', label: '单号' },
  { key: 'sourceNoticeNo', label: '来源采购收货通知单' },
  { key: 'sourceOrderNo', label: '来源采购订单' },
  { key: 'supplier', label: '供应商' },
  { key: 'currency', label: '币别' },
  { key: 'warehouse', label: '入库仓库' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(auditStatusLabels) },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', options: toOptions(kingdeePushStatusLabels) },
  { key: 'businessDate', label: '业务日期' },
  { key: 'actualInboundTime', label: '实际入库时间' },
  { key: 'totalInboundQty', label: '实际入库数量' },
  { key: 'totalAmount', label: '金额' },
  { key: 'pushTime', label: '推送金蝶时间' },
  { key: 'pushFailReason', label: '推送失败原因' },
];

export const transferTargets = [
  {
    id: 'warehouse',
    label: '仓库档案',
    storageKey: PHYSICAL_STORAGE_KEY,
    seedRows: warehouses,
    fileName: '仓库档案',
    keyField: 'code',
    keyLabel: '实体仓编码',
    auditField: 'auditStatus',
    auditDraftValue: 'draft',
    importDefaults: { useStatus: 'enabled' },
    importable: true,
    sampleRows: [
      ['WH000008', '厦门仓', '自营', '直连', '仓库作业系统', '福建省厦门市湖里区物流园 2 号库', '陈仓管', '0592-6666 1000', '启用'],
      ['WH000009', '厦门海沧仓', '第三方', 'SaaS中转', '领星', '福建省厦门市海沧区保税物流中心', '周磊', '', '禁用'],
      ['WH000010', '', '第三方', '直连', '宇宙仓系统', '福建省厦门市集美区某仓', '测试', '', '启用'],
      ['WH000008', '重复编码行', '自营', '直连', '聚水潭', '重复编码测试地址', '测试', '', '禁用'],
    ],
    fields: warehouseFields,
  },
  {
    id: 'warehouse-logical',
    label: '逻辑仓档案',
    storageKey: LOGICAL_STORAGE_KEY,
    seedRows: logicalWarehouses,
    fileName: '逻辑仓档案',
    keyField: 'code',
    keyLabel: '逻辑仓编码',
    auditField: 'auditStatus',
    auditDraftValue: 'draft',
    importDefaults: { useStatus: 'enabled' },
    importable: true,
    fields: [
      { key: 'code', label: '逻辑仓编码', required: true, example: 'LWH000010' },
      { key: 'name', label: '逻辑仓名称', required: true, example: '深圳正常品仓' },
      { key: 'physicalWarehouseId', label: '所属实体仓', example: 'physical-warehouse-1' },
      { key: 'stockStatus', label: '库存状态', options: toOptions(stockStatusLabels), example: '正常品' },
      { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
      { key: 'auditStatus', label: '审核状态', importable: false, options: toOptions(warehouseStatusLabels) },
      { key: 'updatedAt', label: '最后更新时间', importable: false },
    ],
  },
  {
    id: 'supplier',
    label: '供应商档案',
    storageKey: SUPPLIER_STORAGE_KEY,
    seedRows: suppliers,
    fileName: '供应商资料',
    keyField: 'code',
    keyLabel: '供应商编码',
    auditField: 'auditStatus',
    auditDraftValue: 'draft',
    importDefaults: { useStatus: 'enabled', level: 'unrated' },
    importable: true,
    fields: [
      { key: 'code', label: '供应商编码', required: true, example: 'SUP000010' },
      { key: 'name', label: '供应商名称', required: true, example: '深圳示例电子有限公司' },
      { key: 'category', label: '供应商分类', example: '充电器类' },
      { key: 'level', label: '供应商等级', example: 'A级' },
      { key: 'creditCode', label: '统一社会信用代码', example: '91440300MA5FXXXX10' },
      { key: 'currency', label: '默认币别', example: '人民币' },
      { key: 'settlementMethod', label: '结算方式', example: '月结' },
      { key: 'paymentTerms', label: '付款条件', example: '月结30天' },
      { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
      { key: 'auditStatus', label: '审核状态', importable: false, options: toOptions(auditLabels) },
      { key: 'updatedAt', label: '最后更新时间', importable: false },
    ],
  },
  ...['unit', 'currency', 'settlement', 'brand', 'payment_terms', 'collection_terms'].map((type) => ({
    id: `auxiliary-${type}`,
    label: `${auxiliaryTypeLabels[type]}资料`,
    storageKey: AUXILIARY_STORAGE_KEY,
    seedRows: auxiliaryItems,
    fileName: `${auxiliaryTypeLabels[type]}资料`,
    keyField: 'code',
    keyLabel: type === 'currency' ? '币别代码' : '资料编码',
    importDefaults: { type, useStatus: 'enabled' },
    importable: type !== 'product_category',
    fields: [
      { key: 'code', label: type === 'currency' ? '币别代码' : '资料编码', required: true, example: type === 'currency' ? 'CNY' : `${type === 'unit' ? 'DW' : type === 'brand' ? 'PP' : type === 'settlement' ? 'JS' : type === 'payment_terms' ? 'FK' : 'SK'}0010` },
      { key: 'name', label: type === 'currency' ? '币别名称' : '资料名称', required: true, example: type === 'currency' ? '人民币' : '示例值' },
      { key: 'remark', label: '备注', example: '' },
      { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
      { key: 'updatedAt', label: '最后更新时间', importable: false },
    ],
  })),
  {
    id: 'logistics-carrier',
    label: '物流商档案',
    storageKey: CARRIER_STORAGE_KEY,
    seedRows: carriers,
    fileName: '物流商资料',
    keyField: 'code',
    keyLabel: '物流商编码',
    importDefaults: { useStatus: 'enabled' },
    importable: true,
    fields: [
      { key: 'code', label: '物流商编码', required: true, example: 'LOG000010' },
      { key: 'name', label: '物流商名称', required: true, example: '示例速运' },
      { key: 'contact', label: '联系人', example: '陈伟' },
      { key: 'phone', label: '联系电话', example: '400-000-0000' },
      { key: 'address', label: '联系地址', example: '广东省深圳市福田区' },
      { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
      { key: 'updatedAt', label: '最后更新时间', importable: false },
    ],
  },
  {
    id: 'logistics-product',
    label: '物流服务产品档案',
    storageKey: LOGISTICS_PRODUCT_STORAGE_KEY,
    seedRows: logisticsProducts,
    fileName: '物流服务产品资料',
    keyField: 'code',
    keyLabel: '物流服务产品编码',
    importDefaults: { useStatus: 'enabled' },
    importable: true,
    fields: [
      { key: 'code', label: '物流服务产品编码', required: true, example: 'LSP000010' },
      { key: 'name', label: '物流服务产品名称', required: true, example: '示例速运国内快递' },
      { key: 'carrierId', label: '所属物流商', example: 'carrier-log000001' },
      { key: 'transportType', label: '运输类型', options: toOptions(transportTypeLabels), example: '国内快递' },
      { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
      { key: 'updatedAt', label: '最后更新时间', importable: false },
    ],
  },
  {
    id: 'product',
    label: '商品档案',
    storageKey: PRODUCT_STORAGE_KEY,
    seedRows: products,
    fileName: '商品资料',
    keyField: 'code',
    keyLabel: '商品编码',
    importDefaults: { useStatus: 'enabled', lifecycleStatus: 'on_sale', salesLevel: 'unrated' },
    importable: true,
    fields: [
      { key: 'code', label: '商品编码', required: true, example: 'SKU-1099' },
      { key: 'name', label: '商品名称', required: true, example: '演示无线键盘' },
      { key: 'categoryPath', label: '商品分类', example: '电子产品/电脑外设/键盘' },
      { key: 'brand', label: '品牌', example: '罗技' },
      { key: 'model', label: '产品型号', example: 'K380' },
      { key: 'unit', label: '基本单位', required: true, example: '个' },
      { key: 'salesLevel', label: '商品销售等级', options: toOptions(salesLevelLabels), example: '未评级' },
      { key: 'lifecycleStatus', label: '商品生命周期状态', options: toOptions(lifecycleStatusLabels), example: '在售' },
      { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
      { key: 'updatedAt', label: '最后更新时间', importable: false },
    ],
  },
  {
    id: 'customer',
    label: '客户档案',
    storageKey: CUSTOMER_STORAGE_KEY,
    seedRows: customers,
    fileName: '客户资料',
    keyField: 'code',
    keyLabel: '客户编码',
    auditField: 'auditStatus',
    auditDraftValue: 'draft',
    importDefaults: { useStatus: 'enabled', level: 'unrated' },
    importable: true,
    fields: [
      { key: 'code', label: '客户编码', required: true, example: 'CUS000010' },
      { key: 'name', label: '客户名称', required: true, example: '示例贸易有限公司' },
      { key: 'category', label: '客户分类', example: '国内2B客户' },
      { key: 'level', label: '客户等级', example: 'A级' },
      { key: 'currency', label: '默认币别', example: '人民币' },
      { key: 'settlementMethod', label: '结算方式', example: '月结' },
      { key: 'collectionTerms', label: '收款条件', example: '月结30天' },
      { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
      { key: 'auditStatus', label: '审核状态', importable: false, options: toOptions(auditLabels) },
      { key: 'updatedAt', label: '最后更新时间', importable: false },
    ],
  },
  {
    id: 'purchase-order',
    label: '采购订单',
    storageKey: 'qs-erp:purchase-orders:v4',
    seedRows: orders,
    fileName: '采购订单',
    keyField: 'orderNo',
    keyLabel: '单据编号',
    importable: false,
    demoImport: true,
    fields: purchaseOrderFields,
  },
  {
    id: 'purchase-receipt-notice',
    label: '采购收货通知单',
    storageKey: 'qs-erp:purchase-receipt-notices:v2',
    seedRows: receiptNotices,
    fileName: '采购收货通知单',
    keyField: 'noticeNo',
    keyLabel: '单号',
    importable: false,
    fields: purchaseReceiptNoticeFields,
  },
  {
    id: 'purchase-inbound',
    label: '采购入库单',
    storageKey: INBOUND_STORAGE_KEY,
    seedRows: inboundOrders,
    fileName: '采购入库单',
    keyField: 'inboundNo',
    keyLabel: '入库单号',
    importable: false,
    fields: purchaseInboundFields,
  },
  {
    id: 'sales-order',
    label: '销售订单',
    storageKey: SALES_ORDER_STORAGE_KEY,
    seedRows: salesOrders,
    fileName: '销售订单',
    keyField: 'orderNo',
    keyLabel: '单据编号',
    importable: false,
    demoImport: true,
    fields: [
      { key: 'orderNo', label: '单号' },
      { key: 'date', label: '单据日期' },
      { key: 'customer', label: '客户' },
      { key: 'warehouse', label: '发货仓库' },
      { key: 'deliveryDate', label: '交期' },
      { key: 'currency', label: '币别' },
      { key: 'amount', label: '价税合计' },
      { key: 'taxAmount', label: '税额' },
      { key: 'netAmount', label: '金额' },
      { key: 'shippedQty', label: '累计实际出库' },
      { key: 'remark', label: '备注' },
      { key: 'createdAt', label: '创建时间' },
      { key: 'auditStatus', label: '审核状态', options: toOptions(salesOrderStatusLabels.auditStatus) },
      { key: 'businessStatus', label: '业务状态', options: toOptions(salesOrderStatusLabels.businessStatus) },
      { key: 'shipStatus', label: '发货状态', options: toOptions(salesOrderStatusLabels.shipStatus) },
      { key: 'updatedAt', label: '最后更新时间' },
    ],
  },
  {
    id: 'sales-delivery-notice',
    label: '销售发货通知单',
    storageKey: DELIVERY_NOTICE_STORAGE_KEY,
    seedRows: salesDeliveryNotices,
    fileName: '销售发货通知单',
    keyField: 'noticeNo',
    keyLabel: '单号',
    importable: false,
    fields: [
      { key: 'noticeNo', label: '单号' },
      { key: 'sourceOrderNo', label: '来源销售订单' },
      { key: 'customer', label: '客户' },
      { key: 'warehouse', label: '发货仓库' },
      { key: 'deliveryMode', label: '发货处理方式', options: toOptions(deliveryModeLabels) },
      { key: 'status', label: '单据状态', options: toOptions(salesNoticeStatusLabels) },
      { key: 'totalNotifyQty', label: '通知数量' },
      { key: 'totalShippedQty', label: '实出数量' },
      { key: 'totalShortQty', label: '缺出数量' },
      { key: 'createdAt', label: '创建时间' },
      { key: 'updatedAt', label: '最后更新时间' },
    ],
  },
  {
    id: 'sales-outbound',
    label: '销售出库单',
    storageKey: SALES_OUTBOUND_STORAGE_KEY,
    seedRows: salesOutbounds,
    fileName: '销售出库单',
    keyField: 'outboundNo',
    keyLabel: '出库单号',
    importable: false,
    fields: [
      { key: 'outboundNo', label: '单号' },
      { key: 'sourceType', label: '来源类型', options: toOptions(sourceTypeLabels) },
      { key: 'sourceNoticeNo', label: '来源销售发货通知单' },
      { key: 'sourceOrderNo', label: '来源销售订单' },
      { key: 'customer', label: '客户' },
      { key: 'currency', label: '币别' },
      { key: 'warehouse', label: '出库仓库' },
      { key: 'auditStatus', label: '审核状态', options: toOptions(auditStatusLabels) },
      { key: 'kingdeePushStatus', label: '金蝶推送状态', options: toOptions(kingdeePushStatusLabels) },
      { key: 'businessDate', label: '业务日期' },
      { key: 'actualOutboundTime', label: '实际出库时间' },
      { key: 'totalOutboundQty', label: '实际出库数量' },
      { key: 'amount', label: '价税合计' },
      { key: 'taxAmount', label: '税额' },
      { key: 'pushTime', label: '推送金蝶时间' },
      { key: 'pushFailReason', label: '推送失败原因' },
      { key: 'createdAt', label: '创建时间' },
      { key: 'updatedAt', label: '最后更新时间' },
    ],
  },
];

export function getTransferTarget(id) {
  return transferTargets.find((target) => target.id === id) || null;
}

export function getImportFields(target) {
  return target.fields.filter((field) => field.importable !== false);
}

export function getExportFields(target) {
  return target.fields.filter((field) => field.exportable !== false);
}

export function readTargetRows(target) {
  return readMockRows(target.storageKey, target.seedRows || []);
}

export function exportFieldValue(field, row) {
  const raw = row?.[field.key];
  if (raw == null || raw === '') return '';
  if (field.options) return field.options.find((option) => option.value === raw)?.label ?? String(raw);
  return String(raw);
}

function normalizeImportValue(value) {
  const text = String(value ?? '').trim();
  return text === EMPTY_PLACEHOLDER ? '' : text;
}

export function validateImportRows(target, headers, rows) {
  const fields = getImportFields(target);
  const fieldByLabel = new Map(fields.map((field) => [field.label, field]));
  const requiredFields = fields.filter((field) => field.required);
  const missingColumns = requiredFields.filter((field) => !headers.includes(field.label)).map((field) => field.label);
  const unknownColumns = headers.filter((header) => header && !fieldByLabel.has(header));
  const existingKeys = new Set(readTargetRows(target).map((row) => String(row[target.keyField] ?? '')));
  const seenKeys = new Set();

  const items = rows.map((cells, index) => {
    const values = {};
    const errors = [];
    headers.forEach((header, cellIndex) => {
      const field = fieldByLabel.get(header);
      if (!field) return;
      const value = normalizeImportValue(cells[cellIndex]);
      if (value) values[field.key] = value;
    });
    requiredFields.forEach((field) => {
      if (!values[field.key]) errors.push(`「${field.label}」不能为空`);
    });
    fields.forEach((field) => {
      const value = values[field.key];
      if (!value || !field.options) return;
      const option = field.options.find((item) => item.label === value || item.value === value);
      if (option) values[field.key] = option.value;
      else errors.push(`「${field.label}」不在可选值范围`);
    });

    const keyValue = values[target.keyField];
    let action = 'create';
    if (keyValue) {
      if (seenKeys.has(keyValue)) errors.push(`「${target.keyLabel}」在文件内重复`);
      seenKeys.add(keyValue);
      if (existingKeys.has(keyValue)) action = 'update';
    }

    return { rowNumber: index + 2, values, action: errors.length ? 'error' : action, errors };
  });

  const summary = {
    total: items.length,
    create: items.filter((item) => item.action === 'create').length,
    update: items.filter((item) => item.action === 'update').length,
    error: items.filter((item) => item.action === 'error').length,
  };

  return {
    items,
    summary,
    unknownColumns,
    headerErrors: missingColumns.map((label) => `缺少必填列「${label}」`),
  };
}
