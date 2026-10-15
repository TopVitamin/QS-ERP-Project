import { emptyFieldMessage } from './formValidation.js';
import { nowStamp } from './format.js';
import {
  CURRENT_LOGIN_ACCOUNT,
  SETTINGS_USERS_CURRENT_USER,
  settingsUsersUseStatusLabels,
} from '../data/settingsUsersData.js';
import { allPermissionPointKeys } from '../data/settingsUsersPermissions.js';

/**
 * 用户与权限的模块规则：账号/角色的校验、表单映射、行操作条件与权限点勾选联动。
 * 业务口径见《用户与权限主PRD》F01～F04、R01～R12；页面交互见两份 Demo PRD。
 */

export { settingsUsersUseStatusLabels };

export function isCurrentAccount(row) {
  return row?.loginName === CURRENT_LOGIN_ACCOUNT;
}

export function isRoleReferenced(role, accounts = []) {
  return accounts.some((account) => (account.roleIds || []).includes(role.id));
}

export function getRoleLabel(role) {
  return role ? `${role.code} ${role.name}` : '';
}

export function resolveRoleLabel(roleId, roles = []) {
  const role = roles.find((item) => item.id === roleId);
  return role ? getRoleLabel(role) : roleId;
}

/** 角色下拉选项：只可选启用中的角色；已分配后停用的角色保留在已选项（主PRD R01）。 */
export function buildRoleSelectOptions(roles = [], selectedIds = []) {
  const enabled = roles.filter((role) => role.useStatus === 'enabled');
  const selectedDisabled = roles.filter((role) => role.useStatus !== 'enabled' && selectedIds.includes(role.id));
  return [...enabled, ...selectedDisabled].map((role) => ({ value: role.id, label: getRoleLabel(role) }));
}

/** 角色筛选选项：含禁用角色，展示 Code-Name（账号页签查询区）。 */
export function buildRoleFilterOptions(roles = []) {
  return [
    { value: '', label: '全部角色' },
    ...roles.map((role) => ({ value: role.id, label: getRoleLabel(role) })),
  ];
}

/** 数据权限页签：每个角色一条预留占位记录，字段按《数据权限（详细稿）》一期按「一期不启用（预留）」展示（主PRD Q01、Q02 已定）。 */
export function buildDataPermissionRows(roles = []) {
  return roles.map((role) => ({
    id: `dp-${role.id}`,
    roleId: role.id,
    roleCode: role.code,
    roleName: role.name,
    dataRange: '一期不启用（预留）',
    controlledModules: '一期不启用（预留）',
    remark: '',
    updater: role.updater,
    updatedAt: role.updatedAt,
  }));
}

export function createEmptyAccountForm() {
  return {
    loginName: '',
    name: '',
    phone: '',
    email: '',
    roleIds: [],
    password: '',
    useStatus: 'enabled',
    remark: '',
  };
}

export function accountToForm(row) {
  return {
    loginName: row.loginName,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    roleIds: [...(row.roleIds || [])],
    password: '',
    useStatus: row.useStatus || 'enabled',
    remark: row.remark || '',
  };
}

export function createEmptyRoleForm() {
  return {
    code: '',
    name: '',
    useStatus: 'enabled',
    remark: '',
  };
}

export function roleToForm(row) {
  return {
    code: row.code,
    name: row.name,
    useStatus: row.useStatus || 'enabled',
    remark: row.remark || '',
  };
}

/** 手机号：录入转半角、去特殊空白（PHONE_11）。 */
export function normalizePhoneInput(value) {
  return String(value ?? '')
    .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, ' ')
    .replace(/[\u00A0\u2007\u202F\u2000-\u200D\u2060\uFEFF]/g, '')
    .trim();
}

/** 邮箱：保存自动转小写（EMAIL）。 */
export function normalizeEmailInput(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function validateAccountForSave(form, { mode, accountId, accounts = [] } = {}) {
  const fieldErrors = {};
  const loginName = form.loginName.trim();
  if (!loginName) {
    fieldErrors.loginName = emptyFieldMessage('登录账号');
  } else if (accounts.some((account) => account.id !== accountId && account.loginName === loginName)) {
    fieldErrors.loginName = '登录账号已存在';
  }
  if (!form.name.trim()) fieldErrors.name = emptyFieldMessage('姓名');
  if (!form.roleIds.length) fieldErrors.roleIds = emptyFieldMessage('角色');
  if (mode === 'create' && !form.password) fieldErrors.password = emptyFieldMessage('初始密码');
  return Object.keys(fieldErrors).length ? { fieldErrors } : null;
}

export function validateRoleForSave(form, { roleId, roles = [] } = {}) {
  const fieldErrors = {};
  const code = form.code.trim();
  const name = form.name.trim();
  if (!code) {
    fieldErrors.code = emptyFieldMessage('角色编码');
  } else if (roles.some((role) => role.id !== roleId && role.code === code)) {
    fieldErrors.code = '角色编码已存在';
  }
  if (!name) {
    fieldErrors.name = emptyFieldMessage('角色名称');
  } else if (roles.some((role) => role.id !== roleId && role.name === name)) {
    fieldErrors.name = '角色名称已存在';
  }
  return Object.keys(fieldErrors).length ? { fieldErrors } : null;
}

export function validatePasswordReset(form) {
  const fieldErrors = {};
  if (!form.password) fieldErrors.password = emptyFieldMessage('新密码');
  if (!form.confirmPassword) {
    fieldErrors.confirmPassword = emptyFieldMessage('确认新密码');
  } else if (form.password !== form.confirmPassword) {
    fieldErrors.confirmPassword = '两次输入的密码不一致';
  }
  return Object.keys(fieldErrors).length ? { fieldErrors } : null;
}

/** 保存账号：缺字段兜底为演示数据格式；创建人/最后更新人按当前操作人记录。 */
export function formToAccountRow(form, { row } = {}) {
  const stamp = nowStamp();
  const loginName = form.loginName.trim();
  return {
    id: row?.id || `acc-${loginName}`,
    loginName,
    name: form.name.trim(),
    phone: normalizePhoneInput(form.phone),
    email: normalizeEmailInput(form.email),
    roleIds: [...form.roleIds],
    useStatus: form.useStatus || 'enabled',
    remark: form.remark || '',
    creator: row?.creator || SETTINGS_USERS_CURRENT_USER,
    createdAt: row?.createdAt || stamp,
    updater: SETTINGS_USERS_CURRENT_USER,
    updatedAt: stamp,
  };
}

export function formToRoleRow(form, { row } = {}) {
  const stamp = nowStamp();
  const code = form.code.trim();
  return {
    id: row?.id || code,
    code,
    name: form.name.trim(),
    useStatus: form.useStatus || 'enabled',
    preset: Boolean(row?.preset),
    // 预置角色权限点只读全选；其余角色保留原勾选，功能权限走独立弹窗维护（主PRD F02、F03）。
    permissionKeys: row?.preset ? null : (row?.permissionKeys || []),
    remark: form.remark || '',
    creator: row?.creator || SETTINGS_USERS_CURRENT_USER,
    createdAt: row?.createdAt || stamp,
    updater: SETTINGS_USERS_CURRENT_USER,
    updatedAt: stamp,
  };
}

export function applyAccountUseStatus(row, useStatus) {
  return { ...row, useStatus, updater: SETTINGS_USERS_CURRENT_USER, updatedAt: nowStamp() };
}

export function applyRoleUseStatus(row, useStatus) {
  return { ...row, useStatus, updater: SETTINGS_USERS_CURRENT_USER, updatedAt: nowStamp() };
}

export function applyRolePermissions(row, permissionKeys) {
  return {
    ...row,
    permissionKeys: normalizePermissionKeys(permissionKeys),
    updater: SETTINGS_USERS_CURRENT_USER,
    updatedAt: nowStamp(),
  };
}

/** 账号页签行操作：编辑、重置密码、停用（当前登录账号不展示）／启用（主PRD §4.7、Demo §3.1）。 */
export function buildAccountRowActions() {
  return [
    { id: 'edit', label: '编辑' },
    { id: 'reset-password', label: '重置密码' },
    { id: 'disable', label: '停用', visibleWhen: (row) => row.useStatus === 'enabled' && !isCurrentAccount(row) },
    { id: 'enable', label: '启用', visibleWhen: (row) => row.useStatus === 'disabled' },
  ];
}

/**
 * 角色页签行操作：配置功能权限、编辑、停用／启用、删除。
 * 预置角色不展示停用与删除；被账号引用的角色不展示删除（主PRD R09、Demo §3.2）。
 */
export function buildRoleRowActions(accounts = []) {
  return [
    { id: 'permissions', label: '配置功能权限' },
    { id: 'edit', label: '编辑' },
    { id: 'disable', label: '停用', visibleWhen: (row) => !row.preset && row.useStatus === 'enabled' },
    { id: 'enable', label: '启用', visibleWhen: (row) => row.useStatus === 'disabled' },
    { id: 'delete', label: '删除', visibleWhen: (row) => !row.preset && !isRoleReferenced(row, accounts) },
  ];
}

export function buildDataPermissionRowActions() {
  return [{ id: 'config', label: '配置' }];
}

// ---------------------------------------------------------------------------
// 功能权限勾选（主PRD R06：勾选任一业务操作自动带出「查看」；取消「查看」联动取消该菜单全部操作）
// ---------------------------------------------------------------------------

export function normalizePermissionKeys(keys = []) {
  const selected = new Set(keys);
  return allPermissionPointKeys.filter((key) => selected.has(key));
}

export function permissionSetsEqual(a = [], b = []) {
  if (a.length !== b.length) return false;
  const other = new Set(b);
  return a.every((key) => other.has(key));
}

export function togglePermissionPoint(selected, object, pointKey) {
  const next = new Set(selected);
  const viewKey = `${object.key}/查看`;
  if (next.has(pointKey)) {
    next.delete(pointKey);
    if (pointKey === viewKey) object.pointKeys.forEach((key) => next.delete(key));
  } else {
    next.add(pointKey);
    if (pointKey !== viewKey) next.add(viewKey);
  }
  return next;
}

export function togglePermissionGroup(selected, group) {
  const next = new Set(selected);
  const keys = group.objects.flatMap((object) => object.pointKeys);
  const allChecked = keys.length > 0 && keys.every((key) => next.has(key));
  keys.forEach((key) => (allChecked ? next.delete(key) : next.add(key)));
  return next;
}

export function getGroupCheckState(selected, group) {
  const keys = group.objects.flatMap((object) => object.pointKeys);
  if (!keys.length) return 'unchecked';
  const count = keys.filter((key) => selected.has(key)).length;
  if (count === 0) return 'unchecked';
  return count === keys.length ? 'checked' : 'indeterminate';
}

/** 权限点搜索：一级菜单、二级菜单名称或任一权限点名称命中即展示。 */
export function matchPermissionObject(keyword, group, object) {
  const term = String(keyword || '').trim().toLowerCase();
  if (!term) return true;
  if (group.label.toLowerCase().includes(term)) return true;
  if (object.label.toLowerCase().includes(term)) return true;
  return object.points.some((point) => point.label.toLowerCase().includes(term));
}
