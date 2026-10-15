import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleAlert, Plus } from 'lucide-react';
import { DocumentListPage } from '../components/erp/DocumentListPage.jsx';
import { SettingsUsersActionDialogs } from '../components/erp/SettingsUsersActionDialogs.jsx';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';
import { matchesDateRange, matchesTextContains } from '../lib/listFilters.js';
import {
  SETTINGS_USERS_ACCOUNTS_STORAGE_KEY,
  SETTINGS_USERS_DATA_PERMISSIONS_STORAGE_KEY,
  SETTINGS_USERS_ROLES_STORAGE_KEY,
  buildSettingsUsersInitialVisibility,
  createAccountColumns,
  dataPermissionColumns,
  roleColumns,
  seedAccounts,
  seedRoles,
  settingsUsersTabFilterKey,
  settingsUsersTabItems,
  settingsUsersUseStatusLabels,
} from '../data/settingsUsersData.js';
import {
  applyAccountUseStatus,
  applyRoleUseStatus,
  buildAccountRowActions,
  buildDataPermissionRowActions,
  buildDataPermissionRows,
  buildRoleFilterOptions,
  buildRoleRowActions,
  isCurrentAccount,
  isRoleReferenced,
} from '../lib/settingsUsersLogic.js';

/**
 * 用户与权限（settings-users）：账号／角色／数据权限三个页签。
 *
 * - 每个页签是独立的列表实例：各自的查询条件、列设置与数据；切换页签保留条件与列设置，
 *   清空勾选并回第一页（切换时通过 config.presetFilters 触发目标页签重置，见下方说明）。
 * - 本页不接真实登录与权限模型：按钮按 Demo 行操作矩阵展示，密码只做前端格式与一致性校验。
 * - 数据权限按「一期不启用（预留）」占位演示，不启用数据过滤（主PRD Q01、Q02，2026-10-15 已定）。
 */

const TAB_ACCOUNTS = 'accounts';
const TAB_ROLES = 'roles';
const TAB_DATA_PERMISSIONS = 'data-permissions';

const useStatusFilterOptions = [
  { value: '', label: '全部' },
  { value: 'enabled', label: settingsUsersUseStatusLabels.enabled },
  { value: 'disabled', label: settingsUsersUseStatusLabels.disabled },
];

function filterAccountRows(row, filters) {
  return matchesTextContains(row.loginName, filters.loginName)
    && matchesTextContains(row.name, filters.name)
    && (!filters.roleId || (row.roleIds || []).includes(filters.roleId))
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

function filterRoleRows(row, filters) {
  return matchesTextContains(row.code, filters.code)
    && matchesTextContains(row.name, filters.name)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

function filterDataPermissionRows(row, filters) {
  return (!filters.roleId || row.roleId === filters.roleId)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function SettingsUsersPage({ onFeedback }) {
  const [activeTab, setActiveTab] = useState(TAB_ACCOUNTS);
  // 页签激活计数：切换时让目标页签实例清空勾选、回第一页，并复位页签高亮（config.presetFilters 值变化即生效）。
  const [activation, setActivation] = useState({ [TAB_ACCOUNTS]: 0, [TAB_ROLES]: 0, [TAB_DATA_PERMISSIONS]: 0 });
  const [accounts, setAccounts] = useState(() => readMockRows(SETTINGS_USERS_ACCOUNTS_STORAGE_KEY, seedAccounts));
  const [roles, setRoles] = useState(() => readMockRows(SETTINGS_USERS_ROLES_STORAGE_KEY, seedRoles));
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    const unsubscribeAccounts = subscribeMockRows(SETTINGS_USERS_ACCOUNTS_STORAGE_KEY, setAccounts);
    const unsubscribeRoles = subscribeMockRows(SETTINGS_USERS_ROLES_STORAGE_KEY, setRoles);
    return () => {
      unsubscribeAccounts();
      unsubscribeRoles();
    };
  }, []);

  // 数据权限页签按角色派生占位记录（每角色一条），随角色集合同步落库。
  const dataPermissionRows = useMemo(() => buildDataPermissionRows(roles), [roles]);
  useEffect(() => {
    writeMockRows(SETTINGS_USERS_DATA_PERMISSIONS_STORAGE_KEY, dataPermissionRows);
  }, [dataPermissionRows]);

  const handleTabChange = useCallback((nextTab) => {
    setActivation((current) => ({ ...current, [nextTab]: (current[nextTab] || 0) + 1 }));
    setActiveTab(nextTab);
  }, []);

  function updateAccountRow(nextRow) {
    const nextRows = accounts.some((item) => item.id === nextRow.id)
      ? accounts.map((item) => (item.id === nextRow.id ? nextRow : item))
      : [nextRow, ...accounts];
    writeMockRows(SETTINGS_USERS_ACCOUNTS_STORAGE_KEY, nextRows);
    setAccounts(nextRows);
  }

  function updateRoleRow(nextRow) {
    const nextRows = roles.some((item) => item.id === nextRow.id)
      ? roles.map((item) => (item.id === nextRow.id ? nextRow : item))
      : [nextRow, ...roles];
    writeMockRows(SETTINGS_USERS_ROLES_STORAGE_KEY, nextRows);
    setRoles(nextRows);
  }

  function removeRoleRow(roleId) {
    const nextRows = roles.filter((item) => item.id !== roleId);
    writeMockRows(SETTINGS_USERS_ROLES_STORAGE_KEY, nextRows);
    setRoles(nextRows);
  }

  function handleAccountRowAction(id, row) {
    if (id === 'edit') {
      setDialog({ type: 'account-form', mode: 'edit', row, accounts, roles });
      return;
    }
    if (id === 'reset-password') {
      setDialog({ type: 'reset-password', row });
      return;
    }
    if (id === 'disable') {
      // 当前登录账号自身不展示停用（Demo §3.1）；如触发则按主PRD §4.7 阻止（防御分支）。
      if (isCurrentAccount(row)) {
        onFeedback?.('不能停用当前登录账号', 'warning');
        return;
      }
      setDialog({ type: 'disable-account', row });
      return;
    }
    if (id === 'enable') {
      updateAccountRow(applyAccountUseStatus(row, 'enabled'));
      onFeedback?.('账号已启用', 'success');
    }
  }

  function handleRoleRowAction(id, row) {
    if (id === 'permissions') {
      setDialog({ type: 'permissions', row });
      return;
    }
    if (id === 'edit') {
      setDialog({ type: 'role-form', mode: 'edit', row, roles });
      return;
    }
    if (id === 'disable') {
      // 预置「系统管理员」角色行不展示停用（主PRD R09）；如触发则走阻止提示（防御分支）。
      if (row.preset) {
        setDialog({ type: 'blocked-disable-role', row });
        return;
      }
      setDialog({ type: 'role-disable', row });
      return;
    }
    if (id === 'enable') {
      updateRoleRow(applyRoleUseStatus(row, 'enabled'));
      onFeedback?.('角色已启用', 'success');
      return;
    }
    if (id === 'delete') {
      // 预置角色与被账号引用的角色行不展示删除（主PRD R09、Demo §3.2）；如触发则走阻止提示（防御分支）。
      if (row.preset || isRoleReferenced(row, accounts)) {
        setDialog({ type: 'blocked-delete-role', row });
        return;
      }
      setDialog({ type: 'role-delete', row });
    }
  }

  function handleDialogComplete(result) {
    if (!result) return;
    if (result.action === 'save-account' || result.action === 'disable-account') {
      updateAccountRow(result.nextRow);
    }
    if (result.action === 'save-role' || result.action === 'disable-role' || result.action === 'save-permissions') {
      updateRoleRow(result.nextRow);
    }
    if (result.action === 'delete-role') {
      removeRoleRow(result.row.id);
    }
    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  const accountColumns = useMemo(() => createAccountColumns(roles), [roles]);
  const accountInitialVisibility = useMemo(() => buildSettingsUsersInitialVisibility(accountColumns), [accountColumns]);
  const roleInitialVisibility = useMemo(() => buildSettingsUsersInitialVisibility(roleColumns), []);
  const dataPermissionInitialVisibility = useMemo(() => buildSettingsUsersInitialVisibility(dataPermissionColumns), []);

  const accountFilterFields = useMemo(() => [
    { key: 'loginName', label: '登录账号', type: 'search', placeholder: '请输入登录账号' },
    { key: 'name', label: '姓名', type: 'search', placeholder: '请输入姓名' },
    { key: 'roleId', label: '角色', type: 'select', options: buildRoleFilterOptions(roles) },
    { key: 'useStatus', label: '使用状态', type: 'select', options: useStatusFilterOptions },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ], [roles]);

  const roleFilterFields = useMemo(() => [
    { key: 'code', label: '角色编码', type: 'search', placeholder: '请输入角色编码' },
    { key: 'name', label: '角色名称', type: 'search', placeholder: '请输入角色名称' },
    { key: 'useStatus', label: '使用状态', type: 'select', options: useStatusFilterOptions },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ], []);

  const dataPermissionFilterFields = useMemo(() => [
    { key: 'roleId', label: '所属角色', type: 'select', options: buildRoleFilterOptions(roles) },
    { key: 'updatedAt', label: '最后更新时间', type: 'date-range' },
  ], [roles]);

  const accountRowActions = useMemo(() => buildAccountRowActions(), []);
  const roleRowActions = useMemo(() => buildRoleRowActions(accounts), [accounts]);
  const dataPermissionRowActions = useMemo(() => buildDataPermissionRowActions(), []);

  // 页签切换时按各页签初值重置（清空勾选、回第一页、复位页签高亮）；查询条件与列设置保留。
  const accountPresetFilters = useMemo(
    () => ({ [settingsUsersTabFilterKey]: TAB_ACCOUNTS }),
    [activation[TAB_ACCOUNTS]],
  );
  const rolePresetFilters = useMemo(
    () => ({ [settingsUsersTabFilterKey]: TAB_ROLES }),
    [activation[TAB_ROLES]],
  );
  const dataPermissionPresetFilters = useMemo(
    () => ({ [settingsUsersTabFilterKey]: TAB_DATA_PERMISSIONS }),
    [activation[TAB_DATA_PERMISSIONS]],
  );

  const tabs = useMemo(() => ({
    filterKey: settingsUsersTabFilterKey,
    items: settingsUsersTabItems,
    showCounts: false,
    onChange: handleTabChange,
  }), [handleTabChange]);

  const accountsConfig = {
    title: '用户与权限',
    rows: accounts,
    storageKey: SETTINGS_USERS_ACCOUNTS_STORAGE_KEY,
    initialFilters: { loginName: '', name: '', roleId: '', useStatus: '', updatedAt: { from: '', to: '' }, [settingsUsersTabFilterKey]: TAB_ACCOUNTS },
    filterRows: filterAccountRows,
    initialVisibility: accountInitialVisibility,
    columns: accountColumns,
    columnOptions: accountColumns.map((column) => ({ key: column.key, label: column.label })),
    filterFields: accountFilterFields,
    initialPinnedKeys: ['loginName'],
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    tabs,
    presetFilters: accountPresetFilters,
    headerActions: [{ id: 'create', label: '新增', icon: Plus, variant: 'primary' }],
    onHeaderAction: (id) => {
      if (id === 'create') setDialog({ type: 'account-form', mode: 'create', row: null, accounts, roles });
    },
    toolbarActions: [],
    rowActions: accountRowActions,
    rowActionsMaxVisible: 3,
    onRowAction: handleAccountRowAction,
    onCellClick: (column, row) => {
      if (column.key === 'loginName') setDialog({ type: 'account-view', row, roles });
    },
    emptyText: '暂无账号，点击「新增」开始维护',
    emptyTextFiltered: '没有符合条件的记录，请调整筛选条件',
    queryMessage: '已执行账号查询',
    resetMessage: '筛选条件已重置',
  };

  const rolesConfig = {
    title: '用户与权限',
    rows: roles,
    storageKey: SETTINGS_USERS_ROLES_STORAGE_KEY,
    initialFilters: { code: '', name: '', useStatus: '', updatedAt: { from: '', to: '' }, [settingsUsersTabFilterKey]: TAB_ROLES },
    filterRows: filterRoleRows,
    initialVisibility: roleInitialVisibility,
    columns: roleColumns,
    columnOptions: roleColumns.map((column) => ({ key: column.key, label: column.label })),
    filterFields: roleFilterFields,
    initialPinnedKeys: ['code'],
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    tabs,
    presetFilters: rolePresetFilters,
    headerActions: [{ id: 'create', label: '新增', icon: Plus, variant: 'primary' }],
    onHeaderAction: (id) => {
      if (id === 'create') setDialog({ type: 'role-form', mode: 'create', row: null, roles });
    },
    toolbarActions: [],
    rowActions: roleRowActions,
    rowActionsMaxVisible: 3,
    onRowAction: handleRoleRowAction,
    onCellClick: (column, row) => {
      if (column.key === 'name') setDialog({ type: 'role-view', row });
    },
    emptyText: '暂无角色，点击「新增」开始维护',
    emptyTextFiltered: '没有符合条件的记录，请调整筛选条件',
    queryMessage: '已执行角色查询',
    resetMessage: '筛选条件已重置',
  };

  const dataPermissionsConfig = {
    title: '用户与权限',
    rows: dataPermissionRows,
    storageKey: SETTINGS_USERS_DATA_PERMISSIONS_STORAGE_KEY,
    initialFilters: { roleId: '', updatedAt: { from: '', to: '' }, [settingsUsersTabFilterKey]: TAB_DATA_PERMISSIONS },
    filterRows: filterDataPermissionRows,
    initialVisibility: dataPermissionInitialVisibility,
    columns: dataPermissionColumns,
    columnOptions: dataPermissionColumns.map((column) => ({ key: column.key, label: column.label })),
    filterFields: dataPermissionFilterFields,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    tabs,
    presetFilters: dataPermissionPresetFilters,
    headerActions: [],
    toolbarActions: [],
    rowActions: dataPermissionRowActions,
    rowActionsMaxVisible: 3,
    onRowAction: (id, row) => {
      if (id === 'config') setDialog({ type: 'data-permission', row });
    },
    emptyText: '一期不启用数据权限过滤（预留结构），启用后在此按角色配置',
    emptyTextFiltered: '没有符合条件的记录，请调整筛选条件',
    queryMessage: '已执行数据权限查询',
    resetMessage: '筛选条件已重置',
  };

  return (
    <>
      <div className={activeTab === TAB_ACCOUNTS ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        <DocumentListPage onFeedback={onFeedback} config={accountsConfig} />
      </div>
      <div className={activeTab === TAB_ROLES ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        <DocumentListPage onFeedback={onFeedback} config={rolesConfig} />
      </div>
      <div className={activeTab === TAB_DATA_PERMISSIONS ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}>
        {/* 数据权限提示条：一期不启用（预留）固定展示（主PRD Q01、Q02，2026-10-15 已定；Demo §3.3） */}
        <div className="flex shrink-0 items-center gap-2 border-b border-erp-warning/40 bg-erp-warning-bg px-4 py-2 text-[12px] text-erp-warning">
          <CircleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} />
          <span>一期不启用数据权限过滤（预留结构）；启用后在此按角色配置。</span>
        </div>
        <DocumentListPage onFeedback={onFeedback} config={dataPermissionsConfig} />
      </div>
      <SettingsUsersActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
      />
    </>
  );
}
