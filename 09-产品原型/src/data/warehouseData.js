export const warehouseStatusLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '已审核',
  rejected: '已驳回',
};

export const warehouseStatusTones = {
  draft: 'text-erp-text-muted',
  pending: 'text-erp-warning',
  approved: 'text-erp-success',
  rejected: 'text-erp-danger',
};

export const warehouseUseStatusLabels = {
  enabled: '启用',
  disabled: '禁用',
};

const seedWarehouses = [
  { code: 'WH-SZ-001', name: '深圳仓', operationType: '自营', dockingType: '直连', dockingSystem: '仓库作业系统', address: '广东省深圳市宝安区福永街道物流园 3 号库', contact: '阿盛', phone: '0755-8888 3201', useStatus: 'enabled', auditStatus: 'approved', updatedAt: '2026-08-18 15:30', creator: '阿盛' },
  { code: 'WH-DG-001', name: '东莞电商仓', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '聚水潭', address: '广东省东莞市虎门镇电商产业园 B2 仓', contact: '陈仓管', phone: '0762-6666 1180', useStatus: 'enabled', auditStatus: 'approved', updatedAt: '2026-08-17 09:12', creator: '阿盛' },
  { code: 'WH-FBA-US', name: 'Amazon FBA（美国）', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '领星', address: '美国加州安大略亚马逊运营中心', contact: '周磊', phone: '', useStatus: 'enabled', auditStatus: 'approved', updatedAt: '2026-08-15 18:02', creator: '周磊' },
  { code: 'WH-US-3PL', name: '第三方海外仓（美国）', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '领星', address: '美国新泽西州 3PL 仓库', contact: '周磊', phone: '', useStatus: 'enabled', auditStatus: 'approved', updatedAt: '2026-08-12 11:20', creator: '周磊' },
  { code: 'WH-FBA-EU', name: 'Amazon FBA（欧洲）', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '领星', address: '德国法兰克福亚马逊运营中心', contact: '周磊', phone: '', useStatus: 'enabled', auditStatus: 'pending', updatedAt: '2026-08-18 10:05', creator: '周磊' },
  { code: 'WH-JP-3PL', name: '第三方海外仓（日本）', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '领星', address: '日本大阪 3PL 仓库', contact: '周磊', phone: '', useStatus: 'disabled', auditStatus: 'pending', updatedAt: '2026-08-16 16:40', creator: '周磊' },
  { code: 'WH-DE-3PL', name: '第三方海外仓（德国）', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '领星', address: '德国杜塞尔多夫 3PL 仓库', contact: '待填写', phone: '', useStatus: 'disabled', auditStatus: 'draft', updatedAt: '2026-08-18 14:22', creator: '周磊' },
  { code: 'WH-UK-3PL', name: '第三方海外仓（英国）', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '领星', address: '英国曼彻斯特 3PL 仓库', contact: '待填写', phone: '', useStatus: 'disabled', auditStatus: 'draft', updatedAt: '2026-08-18 14:18', creator: '周磊' },
  { code: 'WH-HK-TR', name: '第三方中转仓（香港）', operationType: '第三方', dockingType: 'SaaS中转', dockingSystem: '领星', address: '香港葵涌货柜码头中转仓', contact: '待填写', phone: '', useStatus: 'disabled', auditStatus: 'rejected', updatedAt: '2026-08-14 10:44', creator: '周磊' },
];

export const warehouses = seedWarehouses.map((row, index) => ({ id: `warehouse-${index + 1}`, ...row }));

export const warehouseColumns = [
  { key: 'code', label: '实体仓编码', defaultWidth: 150, minWidth: 130, maxWidth: 220, ellipsis: true, link: true },
  { key: 'name', label: '实体仓名称', defaultWidth: 190, minWidth: 140, maxWidth: 260, ellipsis: true },
  { key: 'operationType', label: '运营类型', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true },
  { key: 'dockingType', label: '对接方式', defaultWidth: 110, minWidth: 96, maxWidth: 160, ellipsis: true },
  { key: 'dockingSystem', label: '对接系统', defaultWidth: 140, minWidth: 110, maxWidth: 200, ellipsis: true },
  { key: 'address', label: '仓库地址', defaultWidth: 260, minWidth: 160, maxWidth: 360, ellipsis: true },
  { key: 'contact', label: '联系人', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true },
  { key: 'phone', label: '联系电话', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: (value) => warehouseUseStatusLabels[value] || '-', tone: (value) => (value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success') },
  { key: 'auditStatus', label: '审核状态', defaultWidth: 100, minWidth: 88, maxWidth: 150, ellipsis: true, render: (value) => warehouseStatusLabels[value] || '-', tone: (value) => warehouseStatusTones[value] || '' },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 150, minWidth: 130, maxWidth: 200, ellipsis: true, sortable: true },
];
