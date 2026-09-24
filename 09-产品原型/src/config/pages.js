import { NotificationCenterPage } from '../pages/NotificationCenterPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { PurchaseInboundDetailPage } from '../pages/PurchaseInboundDetailPage.jsx';
import { PurchaseInboundListPage } from '../pages/PurchaseInboundListPage.jsx';
import { PurchaseOrderCreatePage, PurchaseOrderEditPage } from '../pages/PurchaseOrderFormPage.jsx';
import { PurchaseOrderDetailPage } from '../pages/PurchaseOrderDetailPage.jsx';
import { PurchaseOrderListPage } from '../pages/PurchaseOrderListPage.jsx';
import { PurchaseReturnCreatePage, PurchaseReturnEditPage } from '../pages/PurchaseReturnFormPage.jsx';
import { PurchaseReturnDetailPage } from '../pages/PurchaseReturnDetailPage.jsx';
import { PurchaseReturnListPage } from '../pages/PurchaseReturnListPage.jsx';
import { PurchaseReturnNoticeCreatePage, PurchaseReturnNoticeEditPage } from '../pages/PurchaseReturnNoticeFormPage.jsx';
import { PurchaseReturnNoticeDetailPage } from '../pages/PurchaseReturnNoticeDetailPage.jsx';
import { PurchaseReturnNoticeListPage } from '../pages/PurchaseReturnNoticeListPage.jsx';
import { PurchaseReturnOutboundDetailPage } from '../pages/PurchaseReturnOutboundDetailPage.jsx';
import { PurchaseReturnOutboundListPage } from '../pages/PurchaseReturnOutboundListPage.jsx';
import { PurchaseReceiptNoticeCreatePage, PurchaseReceiptNoticeEditPage } from '../pages/PurchaseReceiptNoticeFormPage.jsx';
import { PurchaseReceiptNoticeDetailPage } from '../pages/PurchaseReceiptNoticeDetailPage.jsx';
import { PurchaseReceiptNoticeListPage } from '../pages/PurchaseReceiptNoticeListPage.jsx';
import { ExportCenterPage, ImportCenterPage } from '../pages/TransferCenterPage.jsx';
import { CustomerCreatePage, CustomerEditPage } from '../pages/CustomerFormPage.jsx';
import { CustomerDetailPage } from '../pages/CustomerDetailPage.jsx';
import { CustomerListPage } from '../pages/CustomerListPage.jsx';
import { SupplierCreatePage, SupplierEditPage } from '../pages/SupplierFormPage.jsx';
import { SupplierDetailPage } from '../pages/SupplierDetailPage.jsx';
import { SupplierListPage } from '../pages/SupplierListPage.jsx';
import { WarehouseCreatePage, WarehouseEditPage } from '../pages/WarehouseFormPage.jsx';
import { WarehouseDetailPage } from '../pages/WarehouseDetailPage.jsx';
import { WarehousePhysicalListPage } from '../pages/WarehousePhysicalListPage.jsx';
import { WarehouseLogicalListPage } from '../pages/WarehouseLogicalListPage.jsx';
import { ProductCreatePage, ProductEditPage } from '../pages/ProductFormPage.jsx';
import { ProductDetailPage } from '../pages/ProductDetailPage.jsx';
import { ProductListPage } from '../pages/ProductListPage.jsx';
import { LogisticsCarrierListPage } from '../pages/LogisticsCarrierListPage.jsx';
import { LogisticsProductListPage } from '../pages/LogisticsProductListPage.jsx';
import { LogisticsCarrierDetailPage } from '../pages/LogisticsCarrierDetailPage.jsx';
import { AuxiliaryListPage } from '../pages/AuxiliaryListPage.jsx';
import { SalesOrderCreatePage, SalesOrderEditPage } from '../pages/SalesOrderFormPage.jsx';
import { SalesOrderDetailPage } from '../pages/SalesOrderDetailPage.jsx';
import { SalesOrderListPage } from '../pages/SalesOrderListPage.jsx';
import { SalesDeliveryNoticeCreatePage, SalesDeliveryNoticeEditPage } from '../pages/SalesDeliveryNoticeFormPage.jsx';
import { SalesDeliveryNoticeDetailPage } from '../pages/SalesDeliveryNoticeDetailPage.jsx';
import { SalesDeliveryNoticeListPage } from '../pages/SalesDeliveryNoticeListPage.jsx';
import { SalesOutboundDetailPage } from '../pages/SalesOutboundDetailPage.jsx';
import { SalesOutboundListPage } from '../pages/SalesOutboundListPage.jsx';
import { SalesReturnCreatePage, SalesReturnEditPage } from '../pages/SalesReturnFormPage.jsx';
import { SalesReturnDetailPage } from '../pages/SalesReturnDetailPage.jsx';
import { SalesReturnInboundDetailPage } from '../pages/SalesReturnInboundDetailPage.jsx';
import { SalesReturnInboundListPage } from '../pages/SalesReturnInboundListPage.jsx';
import { SalesReturnListPage } from '../pages/SalesReturnListPage.jsx';
import { SalesReturnNoticeCreatePage, SalesReturnNoticeEditPage } from '../pages/SalesReturnNoticeFormPage.jsx';
import { SalesReturnNoticeDetailPage } from '../pages/SalesReturnNoticeDetailPage.jsx';
import { SalesReturnNoticeListPage } from '../pages/SalesReturnNoticeListPage.jsx';
import { createPlaceholderPage } from '../pages/PlaceholderPage.jsx';
import { InventoryComparePage } from '../pages/InventoryComparePage.jsx';
import { InventoryStockFlowPage } from '../pages/InventoryStockFlowPage.jsx';
import { InventoryStockQueryPage } from '../pages/InventoryStockQueryPage.jsx';
import { DirectTransferCreatePage, DirectTransferEditPage } from '../pages/DirectTransferFormPage.jsx';
import { DirectTransferDetailPage } from '../pages/DirectTransferDetailPage.jsx';
import { DirectTransferListPage } from '../pages/DirectTransferListPage.jsx';
import { OtherInboundDetailPage } from '../pages/OtherInboundDetailPage.jsx';
import { OtherInboundListPage } from '../pages/OtherInboundListPage.jsx';
import { OtherInboundRequestCreatePage, OtherInboundRequestEditPage } from '../pages/OtherInboundRequestFormPage.jsx';
import { OtherInboundRequestDetailPage } from '../pages/OtherInboundRequestDetailPage.jsx';
import { OtherInboundRequestListPage } from '../pages/OtherInboundRequestListPage.jsx';
import { OtherOutboundDetailPage } from '../pages/OtherOutboundDetailPage.jsx';
import { OtherOutboundListPage } from '../pages/OtherOutboundListPage.jsx';
import { OtherOutboundRequestCreatePage, OtherOutboundRequestEditPage } from '../pages/OtherOutboundRequestFormPage.jsx';
import { OtherOutboundRequestDetailPage } from '../pages/OtherOutboundRequestDetailPage.jsx';
import { OtherOutboundRequestListPage } from '../pages/OtherOutboundRequestListPage.jsx';
import { TransferInNoticeDetailPage } from '../pages/TransferInNoticeDetailPage.jsx';
import { TransferInNoticeListPage } from '../pages/TransferInNoticeListPage.jsx';
import { TransferOrderCreatePage, TransferOrderEditPage } from '../pages/TransferOrderFormPage.jsx';
import { TransferOrderDetailPage } from '../pages/TransferOrderDetailPage.jsx';
import { TransferOrderListPage } from '../pages/TransferOrderListPage.jsx';
import { TransferOutNoticeDetailPage } from '../pages/TransferOutNoticeDetailPage.jsx';
import { TransferOutNoticeListPage } from '../pages/TransferOutNoticeListPage.jsx';
import { PurchasePriceListPage } from '../pages/PurchasePriceListPage.jsx';
import { SalesPriceListPage } from '../pages/SalesPriceListPage.jsx';
import { PurchasePriceAdjustListPage } from '../pages/PurchasePriceAdjustListPage.jsx';
import { PurchasePriceAdjustCreatePage, PurchasePriceAdjustEditPage } from '../pages/PurchasePriceAdjustFormPage.jsx';
import { PurchasePriceAdjustDetailPage } from '../pages/PurchasePriceAdjustDetailPage.jsx';
import { SalesPriceAdjustListPage } from '../pages/SalesPriceAdjustListPage.jsx';
import { SalesPriceAdjustCreatePage, SalesPriceAdjustEditPage } from '../pages/SalesPriceAdjustFormPage.jsx';
import { SalesPriceAdjustDetailPage } from '../pages/SalesPriceAdjustDetailPage.jsx';
import { FinanceResultListPage } from '../pages/FinanceResultListPage.jsx';
import { PushExceptionListPage } from '../pages/PushExceptionListPage.jsx';
import { defaultNavItems } from './nav.js';
import { normalizePageId } from '../lib/pageRouting.js';

export const PAGE_REGISTRY = {
  'inventory-stock-query': {
    id: 'inventory-stock-query',
    title: '库存查询',
    navId: 'inventory',
    component: InventoryStockQueryPage,
  },
  'inventory-stock-flow': {
    id: 'inventory-stock-flow',
    title: '库存流水',
    navId: 'inventory',
    component: InventoryStockFlowPage,
  },
  'inventory-compare': {
    id: 'inventory-compare',
    title: '库存比对',
    navId: 'inventory',
    component: InventoryComparePage,
  },
  'inventory-other-inbound-request': {
    id: 'inventory-other-inbound-request',
    title: '其他入库申请单列表',
    navId: 'inventory',
    component: OtherInboundRequestListPage,
  },
  'inventory-other-inbound-request-create': {
    id: 'inventory-other-inbound-request-create',
    title: '新增其他入库申请单',
    navId: 'inventory',
    component: OtherInboundRequestCreatePage,
  },
  'inventory-other-inbound-request-edit': {
    id: 'inventory-other-inbound-request-edit',
    title: '编辑其他入库申请单',
    navId: 'inventory',
    component: OtherInboundRequestEditPage,
  },
  'inventory-other-inbound-request-detail': {
    id: 'inventory-other-inbound-request-detail',
    title: '其他入库申请单详情',
    navId: 'inventory',
    component: OtherInboundRequestDetailPage,
  },
  'inventory-other-inbound': {
    id: 'inventory-other-inbound',
    title: '其他入库单列表',
    navId: 'inventory',
    component: OtherInboundListPage,
  },
  'inventory-other-inbound-detail': {
    id: 'inventory-other-inbound-detail',
    title: '其他入库单详情',
    navId: 'inventory',
    component: OtherInboundDetailPage,
  },
  'inventory-other-outbound-request': {
    id: 'inventory-other-outbound-request',
    title: '其他出库申请单列表',
    navId: 'inventory',
    component: OtherOutboundRequestListPage,
  },
  'inventory-other-outbound-request-create': {
    id: 'inventory-other-outbound-request-create',
    title: '新增其他出库申请单',
    navId: 'inventory',
    component: OtherOutboundRequestCreatePage,
  },
  'inventory-other-outbound-request-edit': {
    id: 'inventory-other-outbound-request-edit',
    title: '编辑其他出库申请单',
    navId: 'inventory',
    component: OtherOutboundRequestEditPage,
  },
  'inventory-other-outbound-request-detail': {
    id: 'inventory-other-outbound-request-detail',
    title: '其他出库申请单详情',
    navId: 'inventory',
    component: OtherOutboundRequestDetailPage,
  },
  'inventory-other-outbound': {
    id: 'inventory-other-outbound',
    title: '其他出库单列表',
    navId: 'inventory',
    component: OtherOutboundListPage,
  },
  'inventory-other-outbound-detail': {
    id: 'inventory-other-outbound-detail',
    title: '其他出库单详情',
    navId: 'inventory',
    component: OtherOutboundDetailPage,
  },
  'inventory-transfer-order': {
    id: 'inventory-transfer-order',
    title: '分步式调拨单列表',
    navId: 'inventory',
    component: TransferOrderListPage,
  },
  'inventory-transfer-order-create': {
    id: 'inventory-transfer-order-create',
    title: '新增分步式调拨单',
    navId: 'inventory',
    component: TransferOrderCreatePage,
  },
  'inventory-transfer-order-edit': {
    id: 'inventory-transfer-order-edit',
    title: '编辑分步式调拨单',
    navId: 'inventory',
    component: TransferOrderEditPage,
  },
  'inventory-transfer-order-detail': {
    id: 'inventory-transfer-order-detail',
    title: '分步式调拨单详情',
    navId: 'inventory',
    component: TransferOrderDetailPage,
  },
  'inventory-transfer-out-notice': {
    id: 'inventory-transfer-out-notice',
    title: '调出通知单列表',
    navId: 'inventory',
    component: TransferOutNoticeListPage,
  },
  'inventory-transfer-out-notice-detail': {
    id: 'inventory-transfer-out-notice-detail',
    title: '调出通知单详情',
    navId: 'inventory',
    component: TransferOutNoticeDetailPage,
  },
  'inventory-transfer-in-notice': {
    id: 'inventory-transfer-in-notice',
    title: '调入通知单列表',
    navId: 'inventory',
    component: TransferInNoticeListPage,
  },
  'inventory-transfer-in-notice-detail': {
    id: 'inventory-transfer-in-notice-detail',
    title: '调入通知单详情',
    navId: 'inventory',
    component: TransferInNoticeDetailPage,
  },
  'inventory-direct-transfer': {
    id: 'inventory-direct-transfer',
    title: '直接调拨单列表',
    navId: 'inventory',
    component: DirectTransferListPage,
  },
  'inventory-direct-transfer-create': {
    id: 'inventory-direct-transfer-create',
    title: '新增直接调拨单',
    navId: 'inventory',
    component: DirectTransferCreatePage,
  },
  'inventory-direct-transfer-edit': {
    id: 'inventory-direct-transfer-edit',
    title: '编辑直接调拨单',
    navId: 'inventory',
    component: DirectTransferEditPage,
  },
  'inventory-direct-transfer-detail': {
    id: 'inventory-direct-transfer-detail',
    title: '直接调拨单详情',
    navId: 'inventory',
    component: DirectTransferDetailPage,
  },
  'price-purchase-list': {
    id: 'price-purchase-list',
    title: '采购价目表',
    navId: 'price',
    component: PurchasePriceListPage,
  },
  'price-sales-list': {
    id: 'price-sales-list',
    title: '销售价目表',
    navId: 'price',
    component: SalesPriceListPage,
  },
  'price-purchase-adjust': {
    id: 'price-purchase-adjust',
    title: '采购价格调整单列表',
    navId: 'price',
    component: PurchasePriceAdjustListPage,
  },
  'price-purchase-adjust-create': {
    id: 'price-purchase-adjust-create',
    title: '新增采购价格调整单',
    navId: 'price',
    component: PurchasePriceAdjustCreatePage,
  },
  'price-purchase-adjust-edit': {
    id: 'price-purchase-adjust-edit',
    title: '编辑采购价格调整单',
    navId: 'price',
    component: PurchasePriceAdjustEditPage,
  },
  'price-purchase-adjust-detail': {
    id: 'price-purchase-adjust-detail',
    title: '采购价格调整单详情',
    navId: 'price',
    component: PurchasePriceAdjustDetailPage,
  },
  'price-sales-adjust': {
    id: 'price-sales-adjust',
    title: '销售价格调整单列表',
    navId: 'price',
    component: SalesPriceAdjustListPage,
  },
  'price-sales-adjust-create': {
    id: 'price-sales-adjust-create',
    title: '新增销售价格调整单',
    navId: 'price',
    component: SalesPriceAdjustCreatePage,
  },
  'price-sales-adjust-edit': {
    id: 'price-sales-adjust-edit',
    title: '编辑销售价格调整单',
    navId: 'price',
    component: SalesPriceAdjustEditPage,
  },
  'price-sales-adjust-detail': {
    id: 'price-sales-adjust-detail',
    title: '销售价格调整单详情',
    navId: 'price',
    component: SalesPriceAdjustDetailPage,
  },
  'purchase-order': {
    id: 'purchase-order',
    title: '采购订单列表',
    navId: 'purchase',
    component: PurchaseOrderListPage,
  },
  'purchase-inbound': {
    id: 'purchase-inbound',
    title: '采购入库单列表',
    navId: 'purchase',
    component: PurchaseInboundListPage,
  },
  'purchase-receipt-notice': {
    id: 'purchase-receipt-notice',
    title: '采购收货通知单列表',
    navId: 'purchase',
    component: PurchaseReceiptNoticeListPage,
  },
  'purchase-receipt-notice-create': {
    id: 'purchase-receipt-notice-create',
    title: '创建采购收货通知单',
    navId: 'purchase',
    component: PurchaseReceiptNoticeCreatePage,
  },
  'purchase-receipt-notice-edit': {
    id: 'purchase-receipt-notice-edit',
    title: '编辑采购收货通知单',
    navId: 'purchase',
    component: PurchaseReceiptNoticeEditPage,
  },
  'purchase-receipt-notice-detail': {
    id: 'purchase-receipt-notice-detail',
    title: '采购收货通知单详情',
    navId: 'purchase',
    component: PurchaseReceiptNoticeDetailPage,
  },
  'purchase-order-create': {
    id: 'purchase-order-create',
    title: '新增采购订单',
    navId: 'purchase',
    component: PurchaseOrderCreatePage,
  },
  'purchase-order-edit': {
    id: 'purchase-order-edit',
    title: '修改采购订单',
    navId: 'purchase',
    component: PurchaseOrderEditPage,
  },
  'purchase-order-detail': {
    id: 'purchase-order-detail',
    title: '采购订单详情',
    navId: 'purchase',
    component: PurchaseOrderDetailPage,
  },
  'purchase-inbound-detail': {
    id: 'purchase-inbound-detail',
    title: '采购入库单详情',
    navId: 'purchase',
    component: PurchaseInboundDetailPage,
  },
  'purchase-return': {
    id: 'purchase-return',
    title: '采购退货单列表',
    navId: 'purchase',
    component: PurchaseReturnListPage,
  },
  'purchase-return-create': {
    id: 'purchase-return-create',
    title: '新增采购退货单',
    navId: 'purchase',
    component: PurchaseReturnCreatePage,
  },
  'purchase-return-edit': {
    id: 'purchase-return-edit',
    title: '编辑采购退货单',
    navId: 'purchase',
    component: PurchaseReturnEditPage,
  },
  'purchase-return-detail': {
    id: 'purchase-return-detail',
    title: '采购退货单详情',
    navId: 'purchase',
    component: PurchaseReturnDetailPage,
  },
  'purchase-return-notice': {
    id: 'purchase-return-notice',
    title: '采退发货通知单列表',
    navId: 'purchase',
    component: PurchaseReturnNoticeListPage,
  },
  'purchase-return-notice-create': {
    id: 'purchase-return-notice-create',
    title: '创建采退发货通知单',
    navId: 'purchase',
    component: PurchaseReturnNoticeCreatePage,
  },
  'purchase-return-notice-edit': {
    id: 'purchase-return-notice-edit',
    title: '编辑采退发货通知单',
    navId: 'purchase',
    component: PurchaseReturnNoticeEditPage,
  },
  'purchase-return-notice-detail': {
    id: 'purchase-return-notice-detail',
    title: '采退发货通知单详情',
    navId: 'purchase',
    component: PurchaseReturnNoticeDetailPage,
  },
  'purchase-return-outbound': {
    id: 'purchase-return-outbound',
    title: '采退出库单列表',
    navId: 'purchase',
    component: PurchaseReturnOutboundListPage,
  },
  'purchase-return-outbound-detail': {
    id: 'purchase-return-outbound-detail',
    title: '采退出库单详情',
    navId: 'purchase',
    component: PurchaseReturnOutboundDetailPage,
  },
  'warehouse-physical': {
    id: 'warehouse-physical',
    title: '实体仓',
    navId: 'base',
    component: WarehousePhysicalListPage,
  },
  'warehouse-logical': {
    id: 'warehouse-logical',
    title: '逻辑仓',
    navId: 'base',
    component: WarehouseLogicalListPage,
  },
  'warehouse-create': {
    id: 'warehouse-create',
    title: '新增实体仓',
    navId: 'base',
    component: WarehouseCreatePage,
  },
  'warehouse-edit': {
    id: 'warehouse-edit',
    title: '编辑实体仓',
    navId: 'base',
    component: WarehouseEditPage,
  },
  'warehouse-detail': {
    id: 'warehouse-detail',
    title: '实体仓详情',
    navId: 'base',
    component: WarehouseDetailPage,
  },
  'base-supplier': {
    id: 'base-supplier',
    title: '供应商资料',
    navId: 'base',
    component: SupplierListPage,
  },
  'base-supplier-create': {
    id: 'base-supplier-create',
    title: '新增供应商',
    navId: 'base',
    component: SupplierCreatePage,
  },
  'base-supplier-edit': {
    id: 'base-supplier-edit',
    title: '编辑供应商',
    navId: 'base',
    component: SupplierEditPage,
  },
  'base-supplier-detail': {
    id: 'base-supplier-detail',
    title: '供应商详情',
    navId: 'base',
    component: SupplierDetailPage,
  },
  'base-customer': {
    id: 'base-customer',
    title: '客户资料',
    navId: 'base',
    component: CustomerListPage,
  },
  'base-customer-create': {
    id: 'base-customer-create',
    title: '新增客户',
    navId: 'base',
    component: CustomerCreatePage,
  },
  'base-customer-edit': {
    id: 'base-customer-edit',
    title: '编辑客户',
    navId: 'base',
    component: CustomerEditPage,
  },
  'base-customer-detail': {
    id: 'base-customer-detail',
    title: '客户详情',
    navId: 'base',
    component: CustomerDetailPage,
  },
  'base-product': {
    id: 'base-product',
    title: '商品资料',
    navId: 'base',
    component: ProductListPage,
  },
  'base-product-create': {
    id: 'base-product-create',
    title: '新增商品',
    navId: 'base',
    component: ProductCreatePage,
  },
  'base-product-edit': {
    id: 'base-product-edit',
    title: '编辑商品',
    navId: 'base',
    component: ProductEditPage,
  },
  'base-product-detail': {
    id: 'base-product-detail',
    title: '商品详情',
    navId: 'base',
    component: ProductDetailPage,
  },
  'base-logistics-carrier': {
    id: 'base-logistics-carrier',
    title: '物流商',
    navId: 'base',
    component: LogisticsCarrierListPage,
  },
  'base-logistics-product': {
    id: 'base-logistics-product',
    title: '物流服务产品',
    navId: 'base',
    component: LogisticsProductListPage,
  },
  'base-logistics-carrier-detail': {
    id: 'base-logistics-carrier-detail',
    title: '物流商详情',
    navId: 'base',
    component: LogisticsCarrierDetailPage,
  },
  'base-auxiliary': {
    id: 'base-auxiliary',
    title: '辅助资料',
    navId: 'base',
    component: AuxiliaryListPage,
  },
  'notification-center': {
    id: 'notification-center',
    title: '消息中心',
    navId: 'settings',
    component: NotificationCenterPage,
  },
  'import-center': {
    id: 'import-center',
    title: '导入中心',
    navId: 'settings',
    component: ImportCenterPage,
  },
  'export-center': {
    id: 'export-center',
    title: '导出中心',
    navId: 'settings',
    component: ExportCenterPage,
  },
  'profile': {
    id: 'profile',
    title: '个人中心',
    navId: 'settings',
    component: ProfilePage,
  },
  'sales-order': {
    id: 'sales-order',
    title: '销售订单列表',
    navId: 'sales',
    component: SalesOrderListPage,
  },
  'sales-order-create': {
    id: 'sales-order-create',
    title: '新增销售订单',
    navId: 'sales',
    component: SalesOrderCreatePage,
  },
  'sales-order-edit': {
    id: 'sales-order-edit',
    title: '编辑销售订单',
    navId: 'sales',
    component: SalesOrderEditPage,
  },
  'sales-order-detail': {
    id: 'sales-order-detail',
    title: '销售订单详情',
    navId: 'sales',
    component: SalesOrderDetailPage,
  },
  'sales-delivery-notice': {
    id: 'sales-delivery-notice',
    title: '销售发货通知单列表',
    navId: 'sales',
    component: SalesDeliveryNoticeListPage,
  },
  'sales-delivery-notice-create': {
    id: 'sales-delivery-notice-create',
    title: '创建销售发货通知单',
    navId: 'sales',
    component: SalesDeliveryNoticeCreatePage,
  },
  'sales-delivery-notice-edit': {
    id: 'sales-delivery-notice-edit',
    title: '编辑销售发货通知单',
    navId: 'sales',
    component: SalesDeliveryNoticeEditPage,
  },
  'sales-delivery-notice-detail': {
    id: 'sales-delivery-notice-detail',
    title: '销售发货通知单详情',
    navId: 'sales',
    component: SalesDeliveryNoticeDetailPage,
  },
  'sales-outbound': {
    id: 'sales-outbound',
    title: '销售出库单列表',
    navId: 'sales',
    component: SalesOutboundListPage,
  },
  'sales-outbound-detail': {
    id: 'sales-outbound-detail',
    title: '销售出库单详情',
    navId: 'sales',
    component: SalesOutboundDetailPage,
  },
  'sales-return': {
    id: 'sales-return',
    title: '销售退货单列表',
    navId: 'sales',
    component: SalesReturnListPage,
  },
  'sales-return-create': {
    id: 'sales-return-create',
    title: '新增销售退货单',
    navId: 'sales',
    component: SalesReturnCreatePage,
  },
  'sales-return-edit': {
    id: 'sales-return-edit',
    title: '编辑销售退货单',
    navId: 'sales',
    component: SalesReturnEditPage,
  },
  'sales-return-detail': {
    id: 'sales-return-detail',
    title: '销售退货单详情',
    navId: 'sales',
    component: SalesReturnDetailPage,
  },
  'sales-return-notice': {
    id: 'sales-return-notice',
    title: '销退收货通知单列表',
    navId: 'sales',
    component: SalesReturnNoticeListPage,
  },
  'sales-return-notice-create': {
    id: 'sales-return-notice-create',
    title: '创建销退收货通知单',
    navId: 'sales',
    component: SalesReturnNoticeCreatePage,
  },
  'sales-return-notice-edit': {
    id: 'sales-return-notice-edit',
    title: '编辑销退收货通知单',
    navId: 'sales',
    component: SalesReturnNoticeEditPage,
  },
  'sales-return-notice-detail': {
    id: 'sales-return-notice-detail',
    title: '销退收货通知单详情',
    navId: 'sales',
    component: SalesReturnNoticeDetailPage,
  },
  'sales-return-inbound': {
    id: 'sales-return-inbound',
    title: '销退入库单列表',
    navId: 'sales',
    component: SalesReturnInboundListPage,
  },
  'sales-return-inbound-detail': {
    id: 'sales-return-inbound-detail',
    title: '销退入库单详情',
    navId: 'sales',
    component: SalesReturnInboundDetailPage,
  },
  'integration-finance-results': {
    id: 'integration-finance-results',
    title: '业财结果单据',
    navId: 'integration',
    component: FinanceResultListPage,
  },
  'integration-push-exceptions': {
    id: 'integration-push-exceptions',
    title: '推送异常',
    navId: 'integration',
    component: PushExceptionListPage,
  },
};

// 还没实现的菜单统一挂占位页：菜单结构以《系统与模块地图》附录为基线，避免逐个手写空页面。
const registeredPageIds = new Set(Object.keys(PAGE_REGISTRY));
for (const navItem of defaultNavItems) {
  for (const group of navItem.groups ?? []) {
    for (const item of group.items) {
      if (registeredPageIds.has(item.pageId)) continue;
      PAGE_REGISTRY[item.pageId] = {
        id: item.pageId,
        title: item.label,
        navId: navItem.id,
        component: createPlaceholderPage({ title: item.label, tag: item.tag }),
      };
    }
  }
}

// 点一级菜单时落到该模块的第一个页面；home 由 App 直接切到工作台视图。
const NAV_DEFAULT_PAGES = {
  home: 'home',
  base: 'warehouse-physical',
  price: 'price-purchase-list',
  purchase: 'purchase-order',
  sales: 'sales-order',
  inventory: 'inventory-stock-query',
  integration: 'integration-finance-results',
  settings: 'import-center',
};

export function resolvePageId(target) {
  const pageId = normalizePageId(target);
  if (NAV_DEFAULT_PAGES[pageId]) return NAV_DEFAULT_PAGES[pageId];
  if (pageId === 'purchase-inbound') return 'purchase-inbound';
  return PAGE_REGISTRY[pageId] ? pageId : null;
}

export function resolveNavId(target) {
  const pageId = resolvePageId(target);
  return pageId ? PAGE_REGISTRY[pageId]?.navId ?? null : null;
}
