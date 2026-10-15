import { currentAccount } from './accountData.js';
import { collectPermissionKeys } from './settingsUsersPermissions.js';

/**
 * 用户与权限（settings-users）演示数据。
 *
 * - Mock 集合按 `qs-erp:settings-users:v1:*` 命名空间分别落库，刷新保留。
 * - 账号与角色互为引用集合：账号的角色下拉读取角色集合，角色删除校验读取账号集合。
 * - 演示数据均取自《用户与权限前端Demo版PRD_弹窗与Mock》§4，虚构示例。
 */

export const SETTINGS_USERS_ACCOUNTS_STORAGE_KEY = 'qs-erp:settings-users:v1:accounts';
export const SETTINGS_USERS_ROLES_STORAGE_KEY = 'qs-erp:settings-users:v1:roles';
// 数据权限按角色派生（每个角色一条预留占位记录），随角色集合同步落库；
// 一期不启用数据权限过滤，占位按「一期不启用（预留）」展示（主PRD Q01、Q02，2026-10-15 已定）。
export const SETTINGS_USERS_DATA_PERMISSIONS_STORAGE_KEY = 'qs-erp:settings-users:v1:data-permissions';

/** 页内页签：账号／角色／数据权限（顺序与骨架一致）。 */
export const settingsUsersTabItems = [
  { value: 'accounts', label: '账号' },
  { value: 'roles', label: '角色' },
  { value: 'data-permissions', label: '数据权限' },
];

/** 页签状态承载在筛选键上（配合 DocumentListPage 的 config.tabs），三个页签为独立列表实例。 */
export const settingsUsersTabFilterKey = 'tab';

/** 当前登录账号（演示原型无真实登录；对齐 data/accountData.js 的 currentAccount，用于隐藏「停用」入口）。 */
export const CURRENT_LOGIN_ACCOUNT = 'asheng';

/** 演示中的当前操作人姓名（新建/更新记录的创建人、最后更新人）。 */
export const SETTINGS_USERS_CURRENT_USER = currentAccount.name;

export const seedAccounts = [
  {
    id: 'acc-asheng',
    loginName: 'asheng',
    name: '阿盛',
    phone: '138****8888',
    email: 'asheng@qiangsheng.com',
    roleIds: ['ROLE_ADMIN'],
    useStatus: 'enabled',
    remark: '',
    creator: '阿盛',
    createdAt: '2026-09-01 09:00:00',
    updater: '阿盛',
    updatedAt: '2026-10-14 09:30:00',
  },
  {
    id: 'acc-zhangcg',
    loginName: 'zhangcg',
    name: '张采购',
    phone: '139****0001',
    email: 'zhangcg@qiangsheng.com',
    roleIds: ['ROLE_CG'],
    useStatus: 'enabled',
    remark: '',
    creator: '阿盛',
    createdAt: '2026-09-05 10:00:00',
    updater: '阿盛',
    updatedAt: '2026-10-13 16:20:00',
  },
  {
    id: 'acc-lixs',
    loginName: 'lixs',
    name: '李销售',
    phone: '139****0002',
    email: 'lixs@qiangsheng.com',
    roleIds: ['ROLE_XS'],
    useStatus: 'enabled',
    remark: '',
    creator: '阿盛',
    createdAt: '2026-09-05 10:10:00',
    updater: '阿盛',
    updatedAt: '2026-10-12 15:10:00',
  },
  {
    id: 'acc-lsq',
    loginName: 'lsq',
    name: '李思乾',
    phone: '138****0003',
    email: 'lsq@qiangsheng.com',
    roleIds: ['ROLE_CG', 'ROLE_XS'],
    useStatus: 'enabled',
    remark: '采购与销售双岗演示账号',
    creator: '阿盛',
    createdAt: '2026-09-20 14:00:00',
    updater: '阿盛',
    updatedAt: '2026-10-11 09:45:00',
  },
  {
    id: 'acc-wangcc',
    loginName: 'wangcc',
    name: '王仓库',
    phone: '137****0002',
    email: '',
    roleIds: ['ROLE_CC'],
    useStatus: 'disabled',
    remark: '',
    creator: '阿盛',
    createdAt: '2026-09-08 11:30:00',
    updater: '阿盛',
    updatedAt: '2026-10-12 11:05:00',
  },
];

export const seedRoles = [
  {
    id: 'ROLE_ADMIN',
    code: 'ROLE_ADMIN',
    name: '系统管理员',
    useStatus: 'enabled',
    preset: true,
    // 预置角色：权限点为全部且只读，不随配置保存（主PRD R09）。
    permissionKeys: null,
    remark: '预置角色，拥有全部权限点，不可停用、不可删除',
    creator: '系统',
    createdAt: '2026-08-01 09:00:00',
    updater: '系统',
    updatedAt: '2026-10-14 09:00:00',
  },
  {
    id: 'ROLE_CG',
    code: 'ROLE_CG',
    name: '采购业务员',
    useStatus: 'enabled',
    preset: false,
    permissionKeys: collectPermissionKeys([
      ['base', ['product', 'supplier', 'physicalWarehouse', 'logicalWarehouse', 'auxiliary']],
      ['price', ['purchasePriceList', 'purchasePriceAdjust']],
      ['purchase', ['purchaseOrder', 'purchaseReceiptNotice', 'purchaseInbound', 'purchaseReturn', 'purchaseReturnNotice', 'purchaseReturnOutbound']],
      ['inventory', ['stockQuery', 'stockFlow']],
      ['settings', ['exportCenter']],
    ]),
    remark: '采购与收货业务',
    creator: '阿盛',
    createdAt: '2026-09-02 09:00:00',
    updater: '阿盛',
    updatedAt: '2026-10-13 15:40:00',
  },
  {
    id: 'ROLE_XS',
    code: 'ROLE_XS',
    name: '销售业务员',
    useStatus: 'enabled',
    preset: false,
    permissionKeys: collectPermissionKeys([
      ['base', ['product', 'customer']],
      ['price', ['salesPriceList', 'salesPriceAdjust']],
      ['sales', ['salesOrder', 'salesDeliveryNotice', 'salesOutbound', 'shopifyOrder', 'domesticOrder', 'crossborderOrder', 'salesReturn', 'salesReturnNotice', 'salesReturnInbound']],
      ['inventory', ['stockQuery']],
      ['settings', ['exportCenter']],
    ]),
    remark: '销售与发退货业务',
    creator: '阿盛',
    createdAt: '2026-09-02 09:10:00',
    updater: '阿盛',
    updatedAt: '2026-10-13 15:30:00',
  },
  {
    id: 'ROLE_CC',
    code: 'ROLE_CC',
    name: '仓库运营',
    useStatus: 'disabled',
    preset: false,
    permissionKeys: collectPermissionKeys([
      ['base', ['product', 'logicalWarehouse']],
      ['purchase', ['purchaseReceiptNotice', 'purchaseReturnNotice']],
      ['sales', ['salesDeliveryNotice', 'salesReturnNotice']],
      ['inventory', ['stockQuery', 'stockFlow', 'otherInboundRequest', 'otherInbound', 'otherOutboundRequest', 'otherOutbound', 'transferOrder', 'transferOutNotice', 'transferInNotice', 'directTransfer', 'inventoryCompare']],
      ['settings', ['exportCenter']],
    ]),
    remark: '库存收发与调拨',
    creator: '阿盛',
    createdAt: '2026-09-03 09:00:00',
    updater: '阿盛',
    updatedAt: '2026-10-12 10:10:00',
  },
];

export const settingsUsersUseStatusLabels = {
  enabled: '启用',
  disabled: '禁用',
};

/** 列表「使用状态」语义色：启用 success，禁用 neutral（muted）。 */
export function settingsUsersUseStatusTone(value) {
  return value === 'disabled' ? 'text-erp-text-muted' : 'text-erp-success';
}

/** 列设置：默认显隐按「列表展示=是」中标记为可选列的字段关闭（备注、最后更新人）。 */
export function buildSettingsUsersInitialVisibility(columns) {
  return Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false]));
}

export function createAccountColumns(roles) {
  const resolveRoles = (roleIds = []) => roleIds
    .map((roleId) => {
      const role = roles.find((item) => item.id === roleId);
      return role ? `${role.code} ${role.name}` : roleId;
    })
    .join(';');
  return [
    { key: 'loginName', label: '登录账号', defaultWidth: 120, minWidth: 100, maxWidth: 160, ellipsis: true, link: true },
    { key: 'name', label: '姓名', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true },
    { key: 'phone', label: '手机号', defaultWidth: 130, minWidth: 110, maxWidth: 170, ellipsis: true },
    { key: 'email', label: '邮箱', defaultWidth: 200, minWidth: 150, maxWidth: 260, ellipsis: true },
    { key: 'roleIds', label: '角色', defaultWidth: 230, minWidth: 160, maxWidth: 320, ellipsis: true, render: (value) => resolveRoles(value) },
    { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => settingsUsersUseStatusLabels[value] || value, tone: settingsUsersUseStatusTone },
    { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
    { key: 'remark', label: '备注', defaultWidth: 180, minWidth: 120, maxWidth: 260, ellipsis: true, defaultVisible: false },
    { key: 'updater', label: '最后更新人', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, defaultVisible: false },
  ];
}

export const roleColumns = [
  { key: 'code', label: '角色编码', defaultWidth: 130, minWidth: 110, maxWidth: 170, ellipsis: true },
  { key: 'name', label: '角色名称', defaultWidth: 150, minWidth: 120, maxWidth: 200, ellipsis: true, link: true },
  { key: 'useStatus', label: '使用状态', defaultWidth: 100, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => settingsUsersUseStatusLabels[value] || value, tone: settingsUsersUseStatusTone },
  { key: 'remark', label: '备注', defaultWidth: 220, minWidth: 140, maxWidth: 320, ellipsis: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updater', label: '最后更新人', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, defaultVisible: false },
];

export const dataPermissionColumns = [
  {
    key: 'roleId',
    label: '所属角色',
    defaultWidth: 220,
    minWidth: 160,
    maxWidth: 280,
    ellipsis: true,
    render: (value, row) => (row.roleCode ? `${row.roleCode} ${row.roleName}` : value),
  },
  { key: 'dataRange', label: '数据范围', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true },
  { key: 'controlledModules', label: '受控模块', defaultWidth: 120, minWidth: 96, maxWidth: 160, ellipsis: true },
  { key: 'remark', label: '备注', defaultWidth: 200, minWidth: 120, maxWidth: 280, ellipsis: true },
  { key: 'updatedAt', label: '最后更新时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
  { key: 'updater', label: '最后更新人', defaultWidth: 110, minWidth: 96, maxWidth: 150, ellipsis: true, defaultVisible: false },
];
