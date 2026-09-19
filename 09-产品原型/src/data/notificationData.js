export const notificationCategories = [
  { value: 'todo', label: '待办' },
  { value: 'business', label: '业务' },
  { value: 'transfer', label: '导入导出' },
  { value: 'system', label: '系统' },
];

export const mockNotifications = [
  { id: 'notice-1', title: '采购订单 CGDD-20260818-00045 已审核', time: '10:24', tag: '采购', category: 'business', read: true, link: { pageId: 'purchase-order' } },
  { id: 'notice-2', title: '入库单 CGRK-20260917-0001 已推送金蝶', time: '09:51', tag: '库存', category: 'business', read: true, link: { pageId: 'purchase-inbound' } },
  { id: 'notice-3', title: '供应商「土豆供应商」资料待审核', time: '昨天 16:40', tag: '主数据', category: 'todo', read: false, link: { pageId: 'warehouse-list' } },
  { id: 'notice-4', title: '采购价格复核：2 条记录待处理', time: '昨天 09:12', tag: '价格', category: 'todo', read: true, link: null },
  { id: 'notice-5', title: '京东自营 8 月对账单已生成', time: '08-17 18:02', tag: '结算', category: 'business', read: true, link: null },
  { id: 'notice-6', title: '本周六 22:00-24:00 系统升级维护', time: '08-17 10:00', tag: '公告', category: 'system', read: true, link: null },
];
