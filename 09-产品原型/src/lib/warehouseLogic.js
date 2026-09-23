import { emptyFieldMessage } from './formValidation.js';
import { createEmptyWarehouseAddress, formatWarehouseAddress, normalizeWarehouseAddress } from './warehouseAddress.js';

export const PHYSICAL_STORAGE_KEY = 'qs-erp:physical-warehouses:v4';
export const LOGICAL_STORAGE_KEY = 'qs-erp:logical-warehouses:v3';

export const physicalAuditLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '审核通过',
  rejected: '已驳回',
};

export const physicalAuditTones = {
  draft: 'text-erp-text-muted',
  pending: 'text-erp-warning',
  approved: 'text-erp-success',
  rejected: 'text-erp-danger',
};

// StatusBadge 只接受语义键：success / warning / danger / info / neutral。
export const physicalAuditBadgeTones = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export const useStatusLabels = {
  enabled: '启用',
  disabled: '禁用',
};

export const stockStatusLabels = {
  normal: '正常品',
  defective: '残次品',
  inspection: '待检品',
};

export const operationTypeOptions = [
  { value: '自营', label: '自营' },
  { value: '第三方', label: '第三方' },
];

export const dockingTypeOptions = [
  { value: '直连', label: '直连' },
  { value: 'SaaS中转', label: 'SaaS中转' },
];

export const dockingSystemOptions = [
  { value: '仓库作业系统', label: '仓库作业系统' },
  { value: '聚水潭', label: '聚水潭' },
  { value: '领星', label: '领星' },
];

export const stockStatusOptions = Object.entries(stockStatusLabels).map(([value, label]) => ({ value, label }));

export function canEditPhysical(row) {
  return row?.auditStatus === 'draft' || row?.auditStatus === 'rejected';
}

export function canEditLogical(row) {
  return row?.auditStatus === 'draft' || row?.auditStatus === 'rejected';
}

export function canSubmitAudit(row) {
  return row?.auditStatus === 'draft' || row?.auditStatus === 'rejected';
}

export function canApprove(row) {
  return row?.auditStatus === 'pending';
}

export function canReject(row) {
  return row?.auditStatus === 'pending';
}

export function canUnapprove(row) {
  return row?.auditStatus === 'approved';
}

export function canEnable(row) {
  return row?.useStatus === 'disabled';
}

export function canDisable(row) {
  return row?.useStatus === 'enabled';
}

export function canAddLogicalWarehouse(physicalRows = []) {
  return physicalRows.some((row) => row.auditStatus === 'approved' && row.useStatus === 'enabled');
}

export function getEligiblePhysicalWarehouses(physicalRows = []) {
  return physicalRows.filter((row) => row.auditStatus === 'approved' && row.useStatus === 'enabled');
}

export function countLogicalByPhysical(logicalRows, physicalId) {
  return logicalRows.filter((row) => row.physicalWarehouseId === physicalId).length;
}

export function getDeleteBlockReasonPhysical(row, logicalRows = []) {
  if (countLogicalByPhysical(logicalRows, row.id) > 0) {
    return '该实体仓下存在逻辑仓，不能删除';
  }
  if (row.referenced) {
    return '该记录已被业务引用，不能删除，可改为禁用';
  }
  return null;
}

export function getDeleteBlockReasonLogical(row) {
  if (row.referenced) {
    return '该记录已被业务引用，不能删除，可改为禁用';
  }
  return null;
}

// 批量操作：选中记录的审核状态必须一致，且满足动作前置状态（用户确认口径）。
export function getBatchAuditBlockReason(rows = [], actionId) {
  if (!rows.length) return '请先选择记录';
  const statuses = new Set(rows.map((row) => row.auditStatus));
  if (statuses.size > 1) return '所选记录的审核状态不一致，请选择相同状态的记录后再批量操作';
  const status = rows[0].auditStatus;
  if (actionId === 'batch-submit' && status !== 'draft' && status !== 'rejected') return '只有草稿或已驳回的记录可以批量提交审核';
  if ((actionId === 'batch-approve' || actionId === 'batch-reject') && status !== 'pending') return '只有待审核的记录可以批量审核';
  return '';
}

export function getBatchDeleteBlockedRows(rows = [], objectType, logicalRows = []) {
  return rows.filter((row) => Boolean(objectType === 'logical'
    ? getDeleteBlockReasonLogical(row)
    : getDeleteBlockReasonPhysical(row, logicalRows)));
}

export function applyBatchAudit(rows = [], actionId) {
  const apply = actionId === 'batch-submit' ? applySubmit : actionId === 'batch-approve' ? applyApprove : applyReject;
  return rows.map((row) => apply(row));
}

export function validatePhysicalForSave(form, existingRows = [], currentId = null) {
  const fieldErrors = {};
  const code = String(form.code || '').trim();
  const name = String(form.name || '').trim();

  if (!code) fieldErrors.code = emptyFieldMessage('实体仓编码');
  if (!name) fieldErrors.name = emptyFieldMessage('实体仓名称');
  if (!form.operationType) fieldErrors.operationType = emptyFieldMessage('运营类型');

  if (code && existingRows.some((row) => row.code === code && row.id !== currentId)) {
    fieldErrors.code = '实体仓编码已存在';
  }
  if (name && existingRows.some((row) => row.name === name && row.id !== currentId)) {
    fieldErrors.name = '实体仓名称已存在';
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function validateLogicalForSave(form, existingRows = [], currentId = null) {
  const fieldErrors = {};
  const code = String(form.code || '').trim();
  const name = String(form.name || '').trim();

  if (!code) fieldErrors.code = emptyFieldMessage('逻辑仓编码');
  if (!name) fieldErrors.name = emptyFieldMessage('逻辑仓名称');
  if (!form.physicalWarehouseId) fieldErrors.physicalWarehouseId = '请选择所属实体仓';
  if (!form.stockStatus) fieldErrors.stockStatus = '请选择库存状态';

  if (code && existingRows.some((row) => row.code === code && row.id !== currentId)) {
    fieldErrors.code = '逻辑仓编码已存在';
  }
  if (name && existingRows.some((row) => row.name === name && row.physicalWarehouseId === form.physicalWarehouseId && row.id !== currentId)) {
    fieldErrors.name = '同一实体仓下逻辑仓名称已存在';
  }

  if (Object.keys(fieldErrors).length) return { fieldErrors };
  return null;
}

export function applySubmit(row) {
  return { ...row, auditStatus: 'pending', updatedAt: formatNow() };
}

export function applyApprove(row, auditor = '主数据管理员') {
  return {
    ...row,
    auditStatus: 'approved',
    auditor,
    auditedAt: formatNow(),
    updatedAt: formatNow(),
    updater: auditor,
  };
}

export function applyReject(row) {
  return { ...row, auditStatus: 'rejected', updatedAt: formatNow() };
}

export function applyUnapprove(row) {
  return { ...row, auditStatus: 'draft', updatedAt: formatNow() };
}

export function applyEnable(row) {
  return { ...row, useStatus: 'enabled', updatedAt: formatNow() };
}

export function applyDisable(row) {
  return { ...row, useStatus: 'disabled', updatedAt: formatNow() };
}

export function buildPhysicalStatusBadges(row) {
  return [
    { label: physicalAuditLabels[row.auditStatus] || row.auditStatus, tone: physicalAuditBadgeTones[row.auditStatus] || 'neutral' },
    { label: useStatusLabels[row.useStatus] || row.useStatus, tone: row.useStatus === 'disabled' ? 'neutral' : 'success' },
  ];
}

export function buildLogicalStatusBadges(row) {
  return buildPhysicalStatusBadges(row);
}

function formatNow() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function createEmptyPhysicalForm() {
  return {
    code: '',
    name: '',
    operationType: '',
    remark: '',
    warehouseAddress: createEmptyWarehouseAddress(),
    contact: '',
    phone: '',
    dockingType: '',
    dockingSystem: '',
    thirdPartyCode: '',
    thirdPartyOwner: '',
    authConfig: '',
  };
}

export function physicalRowToForm(row) {
  if (!row) return createEmptyPhysicalForm();
  return {
    code: row.code || '',
    name: row.name || '',
    operationType: row.operationType || '',
    remark: row.remark || '',
    warehouseAddress: normalizeWarehouseAddress(row.warehouseAddress, row.address),
    contact: row.contact || '',
    phone: row.phone || '',
    dockingType: row.dockingType || '',
    dockingSystem: row.dockingSystem || '',
    thirdPartyCode: row.thirdPartyCode || '',
    thirdPartyOwner: row.thirdPartyOwner || '',
    authConfig: row.authConfig || '',
  };
}

export function physicalFormToRow(form, existingRow = {}) {
  const warehouseAddress = normalizeWarehouseAddress(form.warehouseAddress);
  return {
    ...existingRow,
    ...form,
    warehouseAddress,
    address: formatWarehouseAddress(warehouseAddress),
  };
}

export function createEmptyLogicalForm(physicalWarehouseId = '') {
  return {
    code: '',
    name: '',
    physicalWarehouseId,
    stockStatus: '',
    remark: '',
  };
}
