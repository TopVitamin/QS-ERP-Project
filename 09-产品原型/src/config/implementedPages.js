/** 演示原型当前已接入的页面；其余菜单仍保留结构，但标记为「未完成」且不可进入。 */
export const INCOMPLETE_MENU_TAG = '未完成';

export const IMPLEMENTED_PAGE_IDS = new Set([
  'warehouse-physical',
  'warehouse-logical',
  'warehouse-create',
  'warehouse-edit',
  'warehouse-detail',
  'base-supplier',
  'base-supplier-create',
  'base-supplier-edit',
  'base-supplier-detail',
  'base-customer',
  'base-customer-create',
  'base-customer-edit',
  'base-customer-detail',
  'base-product',
  'base-product-create',
  'base-product-edit',
  'base-product-detail',
  'base-logistics-carrier',
  'base-logistics-carrier-detail',
  'base-logistics-product',
  'base-auxiliary',
  'purchase-order',
  'purchase-order-create',
  'purchase-order-edit',
  'purchase-order-detail',
  'purchase-receipt-notice',
  'purchase-receipt-notice-create',
  'purchase-receipt-notice-edit',
  'purchase-receipt-notice-detail',
  'purchase-inbound',
  'purchase-inbound-detail',
  'sales-order',
  'sales-order-create',
  'sales-order-edit',
  'sales-order-detail',
  'sales-delivery-notice',
  'sales-delivery-notice-create',
  'sales-delivery-notice-edit',
  'sales-delivery-notice-detail',
  'sales-outbound',
  'sales-outbound-detail',
  'import-center',
  'export-center',
  'notification-center',
  'profile',
]);

export function isPageImplemented(pageId) {
  // 工作台一期后置，侧栏仍保留演示入口。
  if (pageId === 'home') return true;
  return IMPLEMENTED_PAGE_IDS.has(pageId);
}

export function isNavModuleAccessible(navItem) {
  if (navItem.id === 'home') return true;
  return navItem.groups?.some((group) => group.items.some((item) => isPageImplemented(item.pageId))) ?? false;
}
