/** 演示原型当前已接入的页面；其余菜单仍保留结构，但标记为「未完成」且不可进入。 */
export const INCOMPLETE_MENU_TAG = '未完成';

/**
 * 故意留空、仅保留页面代码的 pageId 可写在这里，方便对照：
 * - warehouse-list：仓库资料列表，含页内 Tab（审核状态）交互样板，PRD 未收口前不对访客开放。
 */
export const IMPLEMENTED_PAGE_IDS = new Set([
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
