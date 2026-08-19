import { PurchaseInboundCreatePage, PurchaseInboundEditPage } from '../pages/PurchaseInboundFormPage.jsx';
import { PurchaseInboundDetailPage } from '../pages/PurchaseInboundDetailPage.jsx';
import { PurchaseInboundListPage } from '../pages/PurchaseInboundListPage.jsx';
import { PurchaseOrderCreatePage, PurchaseOrderEditPage } from '../pages/PurchaseOrderFormPage.jsx';
import { PurchaseOrderDetailPage } from '../pages/PurchaseOrderDetailPage.jsx';
import { PurchaseOrderListPage } from '../pages/PurchaseOrderListPage.jsx';

export const PAGE_REGISTRY = {
  'purchase-order': {
    id: 'purchase-order',
    title: '采购订单列表',
    component: PurchaseOrderListPage,
  },
  'purchase-inbound': {
    id: 'purchase-inbound',
    title: '采购入库单列表',
    component: PurchaseInboundListPage,
  },
  'purchase-order-create': {
    id: 'purchase-order-create',
    title: '新增采购订单',
    component: PurchaseOrderCreatePage,
  },
  'purchase-order-edit': {
    id: 'purchase-order-edit',
    title: '修改采购订单',
    component: PurchaseOrderEditPage,
  },
  'purchase-order-detail': {
    id: 'purchase-order-detail',
    title: '采购订单详情',
    component: PurchaseOrderDetailPage,
  },
  'purchase-inbound-create': {
    id: 'purchase-inbound-create',
    title: '新增采购入库单',
    component: PurchaseInboundCreatePage,
  },
  'purchase-inbound-edit': {
    id: 'purchase-inbound-edit',
    title: '修改采购入库单',
    component: PurchaseInboundEditPage,
  },
  'purchase-inbound-detail': {
    id: 'purchase-inbound-detail',
    title: '采购入库单详情',
    component: PurchaseInboundDetailPage,
  },
};

export function resolvePageId(target) {
  if (target === 'purchase' || target === 'purchase-order') return 'purchase-order';
  if (target === 'purchase-inbound') return 'purchase-inbound';
  return PAGE_REGISTRY[target] ? target : null;
}
