import { NotificationCenterPage } from '../pages/NotificationCenterPage.jsx';
import { ProfilePage } from '../pages/ProfilePage.jsx';
import { PurchaseInboundCreatePage, PurchaseInboundEditPage } from '../pages/PurchaseInboundFormPage.jsx';
import { PurchaseInboundDetailPage } from '../pages/PurchaseInboundDetailPage.jsx';
import { PurchaseInboundListPage } from '../pages/PurchaseInboundListPage.jsx';
import { PurchaseOrderCreatePage, PurchaseOrderEditPage } from '../pages/PurchaseOrderFormPage.jsx';
import { PurchaseOrderDetailPage } from '../pages/PurchaseOrderDetailPage.jsx';
import { PurchaseOrderListPage } from '../pages/PurchaseOrderListPage.jsx';
import { ExportCenterPage, ImportCenterPage } from '../pages/TransferCenterPage.jsx';
import { WarehouseListPage } from '../pages/WarehouseListPage.jsx';
import { createPlaceholderPage } from '../pages/PlaceholderPage.jsx';
import { defaultNavItems } from './nav.js';

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
  'purchase-inbound-create': {
    id: 'purchase-inbound-create',
    title: '新增采购入库单',
    navId: 'purchase',
    component: PurchaseInboundCreatePage,
  },
  'purchase-inbound-edit': {
    id: 'purchase-inbound-edit',
    title: '修改采购入库单',
    navId: 'purchase',
    component: PurchaseInboundEditPage,
  },
  'purchase-inbound-detail': {
    id: 'purchase-inbound-detail',
    title: '采购入库单详情',
    navId: 'purchase',
    component: PurchaseInboundDetailPage,
  },
  'warehouse-list': {
    id: 'warehouse-list',
    title: '仓库列表',
    navId: 'base',
    component: WarehouseListPage,
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
  base: 'base-product',
  price: 'price-purchase-list',
  purchase: 'purchase-order',
  sales: 'sales-order',
  inventory: 'inventory-stock-query',
  integration: 'integration-finance-results',
  settings: 'import-center',
};

export function resolvePageId(target) {
  if (NAV_DEFAULT_PAGES[target]) return NAV_DEFAULT_PAGES[target];
  if (target === 'purchase-inbound') return 'purchase-inbound';
  if (target === 'warehouse') return 'warehouse-list';
  return PAGE_REGISTRY[target] ? target : null;
}

export function resolveNavId(target) {
  const pageId = resolvePageId(target);
  return pageId ? PAGE_REGISTRY[pageId]?.navId ?? null : null;
}
