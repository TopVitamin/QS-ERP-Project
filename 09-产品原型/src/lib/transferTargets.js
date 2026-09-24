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
import {
  compareDirectionLabels,
  stockCompareSeeds,
  stockEventTypeLabels,
  stockFlowSeeds,
  stockRowSeeds,
} from '../data/inventoryStockData.js';
import {
  STOCK_COMPARE_STORAGE_KEY,
  STOCK_FLOW_STORAGE_KEY,
  STOCK_STORAGE_KEY,
} from './inventoryStockLogic.js';
import { otherInboundRequests } from '../data/otherInboundRequestData.js';
import { otherInbounds } from '../data/otherInboundData.js';
import { otherOutboundRequests } from '../data/otherOutboundRequestData.js';
import { otherOutbounds } from '../data/otherOutboundData.js';
import { transferOrders } from '../data/transferOrderData.js';
import { transferOutNotices } from '../data/transferOutNoticeData.js';
import { transferInNotices } from '../data/transferInNoticeData.js';
import { directTransfers } from '../data/directTransferData.js';
import {
  OTHER_INBOUND_REQUEST_STORAGE_KEY,
  otherInboundRequestStatusLabels,
} from './otherInboundRequestLogic.js';
import {
  OTHER_INBOUND_STORAGE_KEY,
  kingdeePushStatusLabels as otherInboundKingdeeLabels,
  otherInboundAuditLabels,
  otherInboundSourceTypeLabels,
} from './otherInboundLogic.js';
import {
  OTHER_OUTBOUND_REQUEST_STORAGE_KEY,
  otherOutboundRequestStatusLabels,
} from './otherOutboundRequestLogic.js';
import {
  OTHER_OUTBOUND_STORAGE_KEY,
  kingdeePushStatusLabels as otherOutboundKingdeeLabels,
  otherOutboundAuditLabels,
  otherOutboundSourceTypeLabels,
} from './otherOutboundLogic.js';
import {
  TRANSFER_ORDER_STORAGE_KEY,
  transferAuditLabels,
  transferBusinessDisplayLabels,
} from './transferOrderLogic.js';
import {
  TRANSFER_OUT_NOTICE_STORAGE_KEY,
  transferOutNoticeStatusLabels,
} from './transferOutNoticeLogic.js';
import {
  TRANSFER_IN_NOTICE_STORAGE_KEY,
  transferInNoticeStatusLabels,
} from './transferInNoticeLogic.js';
import {
  DIRECT_TRANSFER_STORAGE_KEY,
  directTransferAuditLabels,
  directTransferSourceTypeLabels,
  kingdeePushStatusLabels as directTransferKingdeeLabels,
} from './directTransferLogic.js';
import {
  getInventoryLogicalWarehouseOptions,
} from '../data/warehouseData.js';
import { purchaseReturns, purchaseReturnStatusLabels } from '../data/purchaseReturnData.js';
import { purchaseReturnNotices } from '../data/purchaseReturnNoticeData.js';
import { purchaseReturnOutbounds } from '../data/purchaseReturnOutboundData.js';
import { salesReturns, salesReturnStatusLabels } from '../data/salesReturnData.js';
import { salesReturnNotices } from '../data/salesReturnNoticeData.js';
import { salesReturnInbounds } from '../data/salesReturnInboundData.js';
import {
  PURCHASE_RETURN_STORAGE_KEY,
  RETURN_NOTICE_STORAGE_KEY,
} from './purchaseReturnLogic.js';
import {
  RETURN_INBOUND_STORAGE_KEY,
  RETURN_NOTICE_STORAGE_KEY as SALES_RETURN_NOTICE_STORAGE_KEY,
  SALES_RETURN_STORAGE_KEY,
} from './salesReturnLogic.js';
import { returnNoticeStatusLabels as purchaseReturnNoticeStatusLabels, returnShipModeLabels } from './purchaseReturnNoticeLogic.js';
import { returnNoticeStatusLabels as salesReturnNoticeStatusLabels, returnReceiveModeLabels } from './salesReturnNoticeLogic.js';
import {
  auditStatusLabels as returnAuditStatusLabels,
  kingdeePushStatusLabels as returnKingdeePushStatusLabels,
  RETURN_OUTBOUND_STORAGE_KEY,
} from './purchaseReturnOutboundLogic.js';
import { sourceTypeLabels as salesReturnInboundSourceTypeLabels } from './salesReturnInboundLogic.js';
import { purchasePrices, salesPrices } from '../data/priceData.js';
import { purchasePriceAdjustments, salesPriceAdjustments } from '../data/priceAdjustData.js';
import { currencyOptions, customerOptions, supplierOptions } from '../data/masterData.js';
import { PURCHASE_PRICE_STORAGE_KEY, SALES_PRICE_STORAGE_KEY, priceCustomerLevelLabels, priceRangeLabels } from './priceLogic.js';
import { priceAdjustStatusLabels, PURCHASE_ADJUST_STORAGE_KEY, SALES_ADJUST_STORAGE_KEY } from './priceAdjustLogic.js';
import {
  PURCHASE_RETURN_IMPORT_FIELDS,
  commitPurchaseReturnImport,
  validatePurchaseReturnImport,
} from './purchaseReturnImport.js';
import {
  SALES_RETURN_IMPORT_FIELDS,
  commitSalesReturnImport,
  validateSalesReturnImport,
} from './salesReturnImport.js';

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

/** 采购退货单：列按《采购退货单（详细稿）》「列表展示=是」与列表页 Demo PRD §4.2 */
const purchaseReturnFields = [
  { key: 'returnNo', label: '单号' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'supplier', label: '供应商' },
  { key: 'warehouse', label: '出库仓库' },
  { key: 'sourceInboundNo', label: '来源采购入库单' },
  { key: 'returnDeadline', label: '退货截止日期' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(purchaseReturnStatusLabels.auditStatus) },
  { key: 'businessStatus', label: '业务状态', options: toOptions(purchaseReturnStatusLabels.businessStatus) },
  { key: 'totalShippedQty', label: '累计实出数量' },
  { key: 'totalNotifyQty', label: '在途通知数量' },
  { key: 'totalPushableQty', label: '可下推数量' },
  { key: 'currency', label: '币别' },
  { key: 'amount', label: '价税合计' },
  { key: 'taxAmount', label: '税额' },
  { key: 'netAmount', label: '金额' },
];

/** 采退发货通知单：列按《采退发货通知单（详细稿）》「列表展示=是」与列表页 Demo PRD §4.2 */
const purchaseReturnNoticeFields = [
  { key: 'noticeNo', label: '单号' },
  { key: 'sourceReturnNo', label: '来源采购退货单' },
  { key: 'supplier', label: '供应商' },
  { key: 'warehouse', label: '出库仓库' },
  { key: 'shipMode', label: '发货处理方式', options: toOptions(returnShipModeLabels) },
  { key: 'status', label: '单据状态', options: toOptions(purchaseReturnNoticeStatusLabels) },
  { key: 'totalNotifyQty', label: '通知数量' },
  { key: 'totalShippedQty', label: '实出数量' },
  { key: 'totalShortQty', label: '缺出数量' },
  { key: 'createdAt', label: '创建时间' },
];

/** 采退出库单：列按《采退出库单（详细稿）》「列表展示=是」与列表页 Demo PRD §4.2 */
const purchaseReturnOutboundFields = [
  { key: 'outboundNo', label: '单号' },
  { key: 'sourceNoticeNo', label: '来源采退发货通知单' },
  { key: 'sourceReturnNo', label: '来源采购退货单' },
  { key: 'supplier', label: '供应商' },
  { key: 'warehouse', label: '出库仓库' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(returnAuditStatusLabels) },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', options: toOptions(returnKingdeePushStatusLabels) },
  { key: 'totalOutboundQty', label: '实际出库数量' },
  { key: 'currency', label: '币别' },
  { key: 'amount', label: '价税合计' },
  { key: 'taxAmount', label: '税额' },
  { key: 'netAmount', label: '金额' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

/** 销售退货单：列按《销售退货单（详细稿）》「列表展示=是」与列表页 Demo PRD §4.2 */
const salesReturnFields = [
  { key: 'returnNo', label: '单号' },
  { key: 'customer', label: '客户' },
  { key: 'warehouse', label: '收货仓库' },
  { key: 'sourceOutboundNo', label: '来源销售出库单' },
  { key: 'returnDeadline', label: '退货截止日期' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(salesReturnStatusLabels.auditStatus) },
  { key: 'businessStatus', label: '业务状态', options: toOptions(salesReturnStatusLabels.businessStatus) },
  { key: 'returnedQtyTotal', label: '累计实退数量' },
  { key: 'inTransitQtyTotal', label: '在途通知数量' },
  { key: 'pushableQtyTotal', label: '可下推数量' },
  { key: 'currency', label: '币别' },
  { key: 'amount', label: '价税合计' },
  { key: 'taxAmount', label: '税额' },
  { key: 'netAmount', label: '金额' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

/** 销退收货通知单：列按《销退收货通知单（详细稿）》「列表展示=是」与列表页 Demo PRD §4.2 */
const salesReturnNoticeFields = [
  { key: 'noticeNo', label: '单号' },
  { key: 'sourceReturnNo', label: '来源销售退货单' },
  { key: 'customer', label: '客户' },
  { key: 'warehouse', label: '收货仓库' },
  { key: 'receiveMode', label: '收货处理方式', options: toOptions(returnReceiveModeLabels) },
  { key: 'status', label: '单据状态', options: toOptions(salesReturnNoticeStatusLabels) },
  { key: 'totalNotifyQty', label: '通知数量' },
  { key: 'totalReceivedQty', label: '实收数量' },
  { key: 'totalShortQty', label: '缺收数量' },
  { key: 'createdAt', label: '创建时间' },
];

/** 销退入库单：列按《销退入库单（详细稿）》「列表展示=是」与列表页 Demo PRD §4.2 */
const salesReturnInboundFields = [
  { key: 'inboundNo', label: '单号' },
  { key: 'businessDate', label: '业务日期' },
  { key: 'sourceType', label: '来源类型', options: toOptions(salesReturnInboundSourceTypeLabels) },
  { key: 'sourceNoticeNo', label: '来源销退收货通知单' },
  { key: 'sourceReturnNo', label: '来源销售退货单' },
  { key: 'customer', label: '客户' },
  { key: 'currency', label: '币别' },
  { key: 'warehouse', label: '收货仓库' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(returnAuditStatusLabels) },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', options: toOptions(returnKingdeePushStatusLabels) },
  { key: 'totalReceiveQty', label: '实际收货数量' },
  { key: 'amount', label: '价税合计' },
  { key: 'taxAmount', label: '税额' },
  { key: 'netAmount', label: '金额' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const inventoryStockQueryFields = [
  { key: 'logicalWarehouseLabel', label: '逻辑仓' },
  { key: 'physicalWarehouseLabel', label: '所属实体仓' },
  { key: 'productCode', label: '商品编码' },
  { key: 'barcode', label: '商品条码' },
  { key: 'productName', label: '商品名称' },
  { key: 'unit', label: '基本单位' },
  { key: 'stockStatus', label: '库存状态', options: toOptions(stockStatusLabels) },
  { key: 'instantQty', label: '即时库存' },
  { key: 'reservedQty', label: '预占库存' },
  { key: 'frozenQty', label: '冻结库存' },
  { key: 'availableQty', label: '可用库存' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const inventoryStockFlowFields = [
  { key: 'time', label: '变动时间' },
  { key: 'eventType', label: '事件类型', options: toOptions(stockEventTypeLabels) },
  { key: 'logicalWarehouseLabel', label: '逻辑仓' },
  { key: 'physicalWarehouseLabel', label: '所属实体仓' },
  { key: 'productCode', label: '商品编码' },
  { key: 'barcode', label: '商品条码' },
  { key: 'productName', label: '商品名称' },
  { key: 'unit', label: '基本单位' },
  { key: 'stockStatus', label: '库存状态', options: toOptions(stockStatusLabels) },
  { key: 'instantChangeText', label: '即时库存' },
  { key: 'availableChangeText', label: '可用库存' },
  { key: 'reservedChangeText', label: '预占库存' },
  { key: 'frozenChangeText', label: '冻结库存' },
  { key: 'sourceType', label: '来源单据类型' },
  { key: 'sourceNo', label: '来源单号' },
  { key: 'businessType', label: '业务类型' },
];

const inventoryCompareFields = [
  { key: 'compareTime', label: '比对时间' },
  { key: 'physicalWarehouseLabel', label: '实体仓' },
  { key: 'productCode', label: '商品编码' },
  { key: 'barcode', label: '商品条码' },
  { key: 'productName', label: '商品名称' },
  { key: 'unit', label: '基本单位' },
  { key: 'stockStatus', label: '库存状态', options: toOptions(stockStatusLabels) },
  { key: 'erpQty', label: 'ERP即时库存汇总数量' },
  { key: 'warehouseQty', label: '仓库数量' },
  { key: 'snapshotTime', label: '快照时间' },
  { key: 'difference', label: '差异数量' },
  { key: 'direction', label: '差异方向', options: toOptions(compareDirectionLabels) },
];

/** 采购价目表：列按《采购价目表（详细稿）》「列表展示=是」；主数据引用按 Code-Name 导出。 */
const purchasePriceFields = [
  { key: 'supplier', label: '供应商', options: supplierOptions },
  { key: 'productCode', label: '商品编码' },
  { key: 'barcode', label: '商品条码' },
  { key: 'productName', label: '商品名称' },
  { key: 'unit', label: '基本单位' },
  { key: 'currency', label: '币别', options: currencyOptions },
  { key: 'price', label: '含税单价' },
  { key: 'taxRate', label: '税率' },
  { key: 'netPrice', label: '不含税单价' },
  { key: 'lastAdjustNo', label: '最近调整单号' },
  { key: 'creator', label: '创建人' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updater', label: '最后更新人' },
  { key: 'updatedAt', label: '最后更新时间' },
];

/** 销售价目表：列按《销售价目表（详细稿）》「列表展示=是」。 */
const salesPriceFields = [
  { key: 'range', label: '面向范围', options: toOptions(priceRangeLabels) },
  { key: 'customerLevel', label: '客户等级', options: toOptions(priceCustomerLevelLabels) },
  { key: 'customer', label: '客户', options: customerOptions },
  { key: 'productCode', label: '商品编码' },
  { key: 'barcode', label: '商品条码' },
  { key: 'productName', label: '商品名称' },
  { key: 'unit', label: '基本单位' },
  { key: 'currency', label: '币别', options: currencyOptions },
  { key: 'price', label: '含税单价' },
  { key: 'taxRate', label: '税率' },
  { key: 'netPrice', label: '不含税单价' },
  { key: 'lastAdjustNo', label: '最近调整单号' },
  { key: 'creator', label: '创建人' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updater', label: '最后更新人' },
  { key: 'updatedAt', label: '最后更新时间' },
];

/** 采购价格调整单：列按《采购价格调整单（详细稿）》「列表展示=是」。 */
const purchasePriceAdjustFields = [
  { key: 'adjustNo', label: '单号' },
  { key: 'supplier', label: '供应商', options: supplierOptions },
  { key: 'currency', label: '币别', options: currencyOptions },
  { key: 'lineCount', label: '明细条数' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(priceAdjustStatusLabels) },
  { key: 'remark', label: '备注' },
  { key: 'creator', label: '创建人' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

/** 销售价格调整单：列按《销售价格调整单（详细稿）》「列表展示=是」。 */
const salesPriceAdjustFields = [
  { key: 'adjustNo', label: '单号' },
  { key: 'range', label: '面向范围', options: toOptions(priceRangeLabels) },
  { key: 'customerLevel', label: '客户等级', options: toOptions(priceCustomerLevelLabels) },
  { key: 'customer', label: '客户', options: customerOptions },
  { key: 'currency', label: '币别', options: currencyOptions },
  { key: 'lineCount', label: '明细条数' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(priceAdjustStatusLabels) },
  { key: 'remark', label: '备注' },
  { key: 'creator', label: '创建人' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

// —— 库存管理：其他出入库与调拨（字段取各对象列表列；枚举按字段清单取值）——
const inventoryLogicalWarehouseOptions = getInventoryLogicalWarehouseOptions();

const otherInboundRequestFields = [
  { key: 'requestNo', label: '单号' },
  { key: 'warehouse', label: '入库仓', options: inventoryLogicalWarehouseOptions },
  { key: 'businessType', label: '业务类型' },
  { key: 'status', label: '单据状态', options: toOptions(otherInboundRequestStatusLabels) },
  { key: 'totalRequestQty', label: '申请入库数量' },
  { key: 'totalActualQty', label: '实收数量' },
  { key: 'totalRemainingQty', label: '未收数量' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const otherInboundFields = [
  { key: 'inboundNo', label: '单号' },
  { key: 'sourceType', label: '来源类型', options: toOptions(otherInboundSourceTypeLabels) },
  { key: 'sourceRequestNo', label: '来源其他入库申请单' },
  { key: 'sourceSystem', label: '来源系统' },
  { key: 'sourceNo', label: '来源单号' },
  { key: 'warehouse', label: '入库仓库', options: inventoryLogicalWarehouseOptions },
  { key: 'businessType', label: '业务类型' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(otherInboundAuditLabels) },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', options: toOptions(otherInboundKingdeeLabels) },
  { key: 'totalInboundQty', label: '实际入库数量' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const otherOutboundRequestFields = [
  { key: 'requestNo', label: '单号' },
  { key: 'logicalWarehouse', label: '出库仓', options: inventoryLogicalWarehouseOptions },
  { key: 'businessType', label: '业务类型' },
  { key: 'status', label: '单据状态', options: toOptions(otherOutboundRequestStatusLabels) },
  { key: 'totalQuantity', label: '申请出库数量' },
  { key: 'totalActualQty', label: '实出数量' },
  { key: 'totalRemainingQty', label: '未出数量' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const otherOutboundFields = [
  { key: 'outboundNo', label: '单号' },
  { key: 'sourceType', label: '来源类型', options: toOptions(otherOutboundSourceTypeLabels) },
  { key: 'sourceRequestNo', label: '来源其他出库申请单' },
  { key: 'sourceSystem', label: '来源系统' },
  { key: 'sourceNo', label: '来源单号' },
  { key: 'logicalWarehouse', label: '出库仓库', options: inventoryLogicalWarehouseOptions },
  { key: 'businessType', label: '业务类型' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(otherOutboundAuditLabels) },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', options: toOptions(otherOutboundKingdeeLabels) },
  { key: 'totalOutboundQty', label: '实际出库数量' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const transferOrderFields = [
  { key: 'orderNo', label: '单号' },
  { key: 'outWarehouse', label: '调出仓', options: inventoryLogicalWarehouseOptions },
  { key: 'inWarehouse', label: '接收仓', options: inventoryLogicalWarehouseOptions },
  { key: 'auditStatus', label: '审核状态', options: toOptions(transferAuditLabels) },
  { key: 'businessStatus', label: '业务状态', options: toOptions(transferBusinessDisplayLabels) },
  { key: 'totalQuantity', label: '计划调拨数量' },
  { key: 'totalActualOutQty', label: '累计实际调出' },
  { key: 'totalActualInQty', label: '累计实际调入' },
  { key: 'totalInTransitQty', label: '在途数量' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const transferOutNoticeFields = [
  { key: 'noticeNo', label: '单号' },
  { key: 'sourceOrderNo', label: '来源分步式调拨单' },
  { key: 'outWarehouse', label: '调出仓', options: inventoryLogicalWarehouseOptions },
  { key: 'status', label: '单据状态', options: toOptions(transferOutNoticeStatusLabels) },
  { key: 'totalQuantity', label: '通知调出数量' },
  { key: 'totalActualQty', label: '实际调出数量' },
  { key: 'totalRemainingQty', label: '未发数量' },
  { key: 'pushTime', label: '推送时间' },
  { key: 'pushFailReason', label: '推送失败原因' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const transferInNoticeFields = [
  { key: 'noticeNo', label: '单号' },
  { key: 'sourceOrderNo', label: '来源分步式调拨单' },
  { key: 'inWarehouse', label: '接收仓', options: inventoryLogicalWarehouseOptions },
  { key: 'status', label: '单据状态', options: toOptions(transferInNoticeStatusLabels) },
  { key: 'totalQuantity', label: '通知调入数量' },
  { key: 'totalActualQty', label: '实际调入数量' },
  { key: 'totalShortageQty', label: '少收数量' },
  { key: 'pushTime', label: '推送时间' },
  { key: 'pushFailReason', label: '推送失败原因' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
];

const directTransferFields = [
  { key: 'transferNo', label: '单号' },
  { key: 'sourceType', label: '来源类型', options: toOptions(directTransferSourceTypeLabels) },
  { key: 'sourceOrderNo', label: '来源分步式调拨单' },
  { key: 'sourceNoticeNo', label: '来源通知单' },
  { key: 'fromWarehouse', label: '来源逻辑仓', options: inventoryLogicalWarehouseOptions },
  { key: 'toWarehouse', label: '目标逻辑仓', options: inventoryLogicalWarehouseOptions },
  { key: 'auditStatus', label: '审核状态', options: toOptions(directTransferAuditLabels) },
  { key: 'kingdeePushStatus', label: '金蝶推送状态', options: toOptions(directTransferKingdeeLabels) },
  { key: 'totalQuantity', label: '实际调拨数量' },
  { key: 'createdAt', label: '创建时间' },
  { key: 'updatedAt', label: '最后更新时间' },
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
      { key: 'code', label: '商品编码', required: true, example: 'SP0101010003' },
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
  {
    id: 'purchase-return',
    label: '采购退货单',
    storageKey: PURCHASE_RETURN_STORAGE_KEY,
    seedRows: purchaseReturns,
    fileName: '采购退货单',
    keyField: 'returnNo',
    keyLabel: '单号',
    importable: true,
    documentImportFields: PURCHASE_RETURN_IMPORT_FIELDS,
    validateDocumentImport: validatePurchaseReturnImport,
    commitDocumentImport: commitPurchaseReturnImport,
    fields: purchaseReturnFields,
  },
  {
    id: 'purchase-return-notice',
    label: '采退发货通知单',
    storageKey: RETURN_NOTICE_STORAGE_KEY,
    seedRows: purchaseReturnNotices,
    fileName: '采退发货通知单',
    keyField: 'noticeNo',
    keyLabel: '单号',
    importable: false,
    fields: purchaseReturnNoticeFields,
  },
  {
    id: 'purchase-return-outbound',
    label: '采退出库单',
    storageKey: RETURN_OUTBOUND_STORAGE_KEY,
    seedRows: purchaseReturnOutbounds,
    fileName: '采退出库单',
    keyField: 'outboundNo',
    keyLabel: '单号',
    importable: false,
    fields: purchaseReturnOutboundFields,
  },
  {
    id: 'sales-return',
    label: '销售退货单',
    storageKey: SALES_RETURN_STORAGE_KEY,
    seedRows: salesReturns,
    fileName: '销售退货单',
    keyField: 'returnNo',
    keyLabel: '单号',
    importable: true,
    documentImportFields: SALES_RETURN_IMPORT_FIELDS,
    validateDocumentImport: validateSalesReturnImport,
    commitDocumentImport: commitSalesReturnImport,
    fields: salesReturnFields,
  },
  {
    id: 'sales-return-notice',
    label: '销退收货通知单',
    storageKey: SALES_RETURN_NOTICE_STORAGE_KEY,
    seedRows: salesReturnNotices,
    fileName: '销退收货通知单',
    keyField: 'noticeNo',
    keyLabel: '单号',
    importable: false,
    fields: salesReturnNoticeFields,
  },
  {
    id: 'sales-return-inbound',
    label: '销退入库单',
    storageKey: RETURN_INBOUND_STORAGE_KEY,
    seedRows: salesReturnInbounds,
    fileName: '销退入库单',
    keyField: 'inboundNo',
    keyLabel: '单号',
    importable: false,
    fields: salesReturnInboundFields,
  },
  // —— 库存管理：查询类（库存查询、库存流水、库存比对）——
  // 三个查询页都只导出、不导入（《库存查询主PRD》R09、《库存流水主PRD》R09、《库存比对主PRD》R08）。
  {
    id: 'inventory-stock-query',
    label: '库存查询',
    storageKey: STOCK_STORAGE_KEY,
    seedRows: stockRowSeeds,
    fileName: '库存查询',
    keyField: 'id',
    keyLabel: '库存行',
    importable: false,
    fields: inventoryStockQueryFields,
  },
  {
    id: 'inventory-stock-flow',
    label: '库存流水',
    storageKey: STOCK_FLOW_STORAGE_KEY,
    seedRows: stockFlowSeeds,
    fileName: '库存流水',
    keyField: 'id',
    keyLabel: '流水记录',
    importable: false,
    fields: inventoryStockFlowFields,
  },
  {
    id: 'inventory-compare',
    label: '库存比对',
    storageKey: STOCK_COMPARE_STORAGE_KEY,
    seedRows: stockCompareSeeds,
    fileName: '库存比对',
    keyField: 'id',
    keyLabel: '比对行',
    importable: false,
    fields: inventoryCompareFields,
  },
  {
    id: 'other-inbound-request',
    label: '其他入库申请单',
    storageKey: OTHER_INBOUND_REQUEST_STORAGE_KEY,
    seedRows: otherInboundRequests,
    fileName: '其他入库申请单',
    keyField: 'requestNo',
    keyLabel: '单号',
    importable: false,
    fields: otherInboundRequestFields,
  },
  {
    id: 'other-inbound',
    label: '其他入库单',
    storageKey: OTHER_INBOUND_STORAGE_KEY,
    seedRows: otherInbounds,
    fileName: '其他入库单',
    keyField: 'inboundNo',
    keyLabel: '入库单号',
    importable: false,
    fields: otherInboundFields,
  },
  {
    id: 'other-outbound-request',
    label: '其他出库申请单',
    storageKey: OTHER_OUTBOUND_REQUEST_STORAGE_KEY,
    seedRows: otherOutboundRequests,
    fileName: '其他出库申请单',
    keyField: 'requestNo',
    keyLabel: '单号',
    importable: false,
    fields: otherOutboundRequestFields,
  },
  {
    id: 'other-outbound',
    label: '其他出库单',
    storageKey: OTHER_OUTBOUND_STORAGE_KEY,
    seedRows: otherOutbounds,
    fileName: '其他出库单',
    keyField: 'outboundNo',
    keyLabel: '出库单号',
    importable: false,
    fields: otherOutboundFields,
  },
  {
    id: 'transfer-order',
    label: '分步式调拨单',
    storageKey: TRANSFER_ORDER_STORAGE_KEY,
    seedRows: transferOrders,
    fileName: '分步式调拨单',
    keyField: 'orderNo',
    keyLabel: '单号',
    importable: false,
    fields: transferOrderFields,
  },
  {
    id: 'transfer-out-notice',
    label: '调出通知单',
    storageKey: TRANSFER_OUT_NOTICE_STORAGE_KEY,
    seedRows: transferOutNotices,
    fileName: '调出通知单',
    keyField: 'noticeNo',
    keyLabel: '单号',
    importable: false,
    fields: transferOutNoticeFields,
  },
  {
    id: 'transfer-in-notice',
    label: '调入通知单',
    storageKey: TRANSFER_IN_NOTICE_STORAGE_KEY,
    seedRows: transferInNotices,
    fileName: '调入通知单',
    keyField: 'noticeNo',
    keyLabel: '单号',
    importable: false,
    fields: transferInNoticeFields,
  },
  {
    id: 'direct-transfer',
    label: '直接调拨单',
    storageKey: DIRECT_TRANSFER_STORAGE_KEY,
    seedRows: directTransfers,
    fileName: '直接调拨单',
    keyField: 'transferNo',
    keyLabel: '单号',
    importable: false,
    fields: directTransferFields,
  },
  // —— 价格管理：价目表与价格调整单（导出纳入导出中心，导入一期不做，2026-09-23已定）——
  {
    id: 'purchase-price',
    label: '采购价目表',
    storageKey: PURCHASE_PRICE_STORAGE_KEY,
    seedRows: purchasePrices,
    fileName: '采购价目表',
    keyField: 'id',
    keyLabel: '价目记录',
    importable: false,
    fields: purchasePriceFields,
  },
  {
    id: 'sales-price',
    label: '销售价目表',
    storageKey: SALES_PRICE_STORAGE_KEY,
    seedRows: salesPrices,
    fileName: '销售价目表',
    keyField: 'id',
    keyLabel: '价目记录',
    importable: false,
    fields: salesPriceFields,
  },
  {
    id: 'purchase-price-adjust',
    label: '采购价格调整单',
    storageKey: PURCHASE_ADJUST_STORAGE_KEY,
    seedRows: purchasePriceAdjustments,
    fileName: '采购价格调整单',
    keyField: 'adjustNo',
    keyLabel: '单号',
    importable: false,
    fields: purchasePriceAdjustFields,
  },
  {
    id: 'sales-price-adjust',
    label: '销售价格调整单',
    storageKey: SALES_ADJUST_STORAGE_KEY,
    seedRows: salesPriceAdjustments,
    fileName: '销售价格调整单',
    keyField: 'adjustNo',
    keyLabel: '单号',
    importable: false,
    fields: salesPriceAdjustFields,
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
