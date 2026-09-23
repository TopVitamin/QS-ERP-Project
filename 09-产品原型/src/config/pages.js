import { NotificationCenterPage } from '../pages/NotificationCenterPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { PurchaseInboundDetailPage } from '../pages/PurchaseInboundDetailPage.jsx';
import { PurchaseInboundListPage } from '../pages/PurchaseInboundListPage.jsx';
import { PurchaseOrderCreatePage, PurchaseOrderEditPage } from '../pages/PurchaseOrderFormPage.jsx';
import { PurchaseOrderDetailPage } from '../pages/PurchaseOrderDetailPage.jsx';
import { PurchaseOrderListPage } from '../pages/PurchaseOrderListPage.jsx';
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
import { createPlaceholderPage } from '../pages/PlaceholderPage.jsx';
import { defaultNavItems } from './nav.js';
import { normalizePageId } from '../lib/pageRouting.js';

export const PAGE_REGISTRY = {
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
