export const quickLaunches = [
  { label: '采购订单', description: '新建采购订单', icon: 'order', tone: 'blue', pageId: 'purchase-order-create' },
  { label: '采购入库', description: '登记到货入库', icon: 'inbound', tone: 'cyan', pageId: 'purchase-inbound-create' },
  { label: '采购订单列表', description: '查看订单执行', icon: 'list', tone: 'violet', pageId: 'purchase-order' },
  { label: '采购入库列表', description: '查看入库进度', icon: 'warehouse', tone: 'orange', pageId: 'purchase-inbound' },
  { label: '待审核处理', description: '处理待办单据', icon: 'review', tone: 'pink', action: '打开待审核事项' },
  { label: '库存预警', description: '关注库存风险', icon: 'warning', tone: 'green', action: '库存预警将在后续模块接入' },
];

export const todoCategories = {
  采购: [
    { count: 8, label: '采购订单 / 待审核', tone: 'primary', pageId: 'purchase-order' },
    { count: 4, label: '采购入库 / 待确认', tone: 'success', pageId: 'purchase-inbound' },
    { count: 28, label: '采购订单 / 待入库', tone: 'warning', pageId: 'purchase-order' },
    { count: 2, label: '采购价格 / 待复核', tone: 'danger', action: '采购价格复核将在后续模块接入' },
  ],
  仓存: [
    { count: 7, label: '商品 / 库存预警', tone: 'danger', action: '库存预警将在后续模块接入' },
    { count: 6, label: '采购订单 / 待入库', tone: 'warning', pageId: 'purchase-order' },
    { count: 4, label: '采购入库 / 待确认', tone: 'primary', pageId: 'purchase-inbound' },
    { count: 3, label: '调拨任务 / 待处理', tone: 'success', action: '调拨任务将在后续模块接入' },
  ],
  全部: [
    { count: 12, label: '采购单据 / 待处理', tone: 'primary', pageId: 'purchase-order' },
    { count: 7, label: '库存 / 预警事项', tone: 'danger', action: '库存预警将在后续模块接入' },
    { count: 3, label: '基础资料 / 待完善', tone: 'warning', action: '基础资料将在后续模块接入' },
    { count: 2, label: '价格 / 待复核', tone: 'success', action: '采购价格复核将在后续模块接入' },
  ],
};

export const realtimeMetrics = [
  { label: '采购订单（5 张）', value: '131,609.50', description: '今日已审核采购订单金额' },
  { label: '采购入库（2 张）', value: '8,000.00', description: '今日已确认入库含税金额' },
  { label: '待入库数量', value: '28', description: '当前采购订单剩余待入库' },
  { label: '新增供应商', value: '3', description: '本月新增供应商档案' },
];

export const workbenchWarnings = [
  { label: '最低库存不足商品', count: 8, tone: 'danger' },
  { label: '采购订单交期预警', count: 6, tone: 'warning' },
  { label: '待确认入库单', count: 4, tone: 'primary' },
  { label: '供应商对账待处理', count: 3, tone: 'warning' },
  { label: '采购价格异常', count: 2, tone: 'danger' },
];

export const workbenchAnnouncements = [
  '强盛科技 2026 秋季渠道订货会备货指引已发布',
  '采购订单与入库单字段规则已更新',
];

export const workbenchKnowledge = [
  '新手开单指南',
  '采购入库防错手册',
  '价格带出与改价留痕',
  '常见问题答疑',
];

export const purchaseTrend = [
  { label: '08-01', value: 46 },
  { label: '08-03', value: 58 },
  { label: '08-05', value: 42 },
  { label: '08-07', value: 76 },
  { label: '08-09', value: 68 },
  { label: '08-11', value: 92 },
  { label: '08-13', value: 84 },
  { label: '08-15', value: 108 },
  { label: '08-17', value: 96 },
  { label: '08-19', value: 128 },
  { label: '08-21', value: 116 },
  { label: '08-23', value: 138 },
];
