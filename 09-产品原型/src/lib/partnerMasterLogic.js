import { emptyFieldMessage } from './formValidation.js';

export const auditLabels = {
  draft: '草稿',
  pending: '待审核',
  approved: '审核通过',
  rejected: '已驳回',
};

export const auditTones = {
  draft: 'text-erp-text-muted',
  pending: 'text-erp-warning',
  approved: 'text-erp-success',
  rejected: 'text-erp-danger',
};

// StatusBadge 只接受语义键：success / warning / danger / info / neutral。
export const auditBadgeTones = {
  draft: 'neutral',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

export const useStatusLabels = {
  enabled: '启用',
  disabled: '禁用',
};

export const levelLabels = {
  S: 'S级',
  A: 'A级',
  B: 'B级',
  C: 'C级',
  unrated: '未评级',
};

export const contactTypeOptions = [
  { value: '业务', label: '业务' },
  { value: '财务', label: '财务' },
  { value: '其他', label: '其他' },
];

export const addressTypeOptions = [
  { value: '办公', label: '办公' },
  { value: '发货', label: '发货' },
  { value: '退货', label: '退货' },
];

export function formatNow() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function canEditPartner(row) {
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

export function getDeleteBlockReason(row) {
  if (row.referenced) return '该记录已被业务引用，不能删除，可改为禁用';
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

export function getBatchDeleteBlockedRows(rows = []) {
  return rows.filter((row) => Boolean(getDeleteBlockReason(row)));
}

export function applyBatchAudit(rows = [], actionId) {
  const apply = actionId === 'batch-submit' ? applySubmit : actionId === 'batch-approve' ? applyApprove : applyReject;
  return rows.map((row) => apply(row));
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

export function buildPartnerStatusBadges(row) {
  return [
    { label: auditLabels[row.auditStatus] || row.auditStatus, tone: auditBadgeTones[row.auditStatus] || 'neutral' },
    { label: useStatusLabels[row.useStatus] || row.useStatus, tone: row.useStatus === 'disabled' ? 'neutral' : 'success' },
  ];
}

export function getDefaultContact(contacts = []) {
  return contacts.find((item) => item.isDefault) || null;
}

export function getDefaultContactName(contacts = []) {
  return getDefaultContact(contacts)?.name || '';
}

export function getDefaultContactMobile(contacts = []) {
  return getDefaultContact(contacts)?.mobile || '';
}

export function renderLevel(value) {
  if (!value || value === 'unrated') return '未评级';
  return levelLabels[value] || value;
}

export function toggleDefaultFlag(rows, rowId, key = 'isDefault') {
  return rows.map((row) => (row.id === rowId ? { ...row, [key]: true } : { ...row, [key]: false }));
}

export function createLineId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function validatePartnerBase(form, existingRows = [], currentId = null, entityLabel = '编码') {
  const fieldErrors = {};
  const code = String(form.code || '').trim();
  const name = String(form.name || '').trim();

  if (!code) fieldErrors.code = emptyFieldMessage(`${entityLabel.replace('编码', '')}编码`);
  if (!name) fieldErrors.name = emptyFieldMessage(`${entityLabel.replace('编码', '')}名称`);
  if (!form.category) fieldErrors.category = emptyFieldMessage('分类');

  if (code && existingRows.some((row) => row.code === code && row.id !== currentId)) {
    fieldErrors.code = `${entityLabel.replace('编码', '')}编码已存在`;
  }

  return fieldErrors;
}

export function validateContactLines(contacts = []) {
  for (let index = 0; index < contacts.length; index += 1) {
    const line = contacts[index];
    if (!String(line.name || '').trim()) {
      return { message: `第${index + 1}行联系人姓名不能为空` };
    }
  }
  return null;
}

export function validateAddressLines(addresses = []) {
  for (let index = 0; index < addresses.length; index += 1) {
    const line = addresses[index];
    if (!String(line.detailAddress || '').trim()) {
      return { message: `第${index + 1}行详细地址不能为空` };
    }
  }
  return null;
}

export function validateBankLines(banks = [], labels = { accountName: '收款户名', accountNo: '收款账号', bankName: '开户银行' }) {
  for (let index = 0; index < banks.length; index += 1) {
    const line = banks[index];
    if (!String(line.accountName || '').trim()) return { message: `第${index + 1}行${labels.accountName}不能为空` };
    if (!String(line.accountNo || '').trim()) return { message: `第${index + 1}行${labels.accountNo}不能为空` };
    if (!String(line.bankName || '').trim()) return { message: `第${index + 1}行${labels.bankName}不能为空` };
  }
  return null;
}

export function createEmptyContact() {
  return { id: createLineId('contact'), name: '', type: '业务', mobile: '', phone: '', email: '', isDefault: false, remark: '' };
}

export function createEmptyAddress() {
  return {
    id: createLineId('address'),
    addressType: '办公',
    country: '中国',
    province: '',
    city: '',
    district: '',
    detailAddress: '',
    contactName: '',
    contactPhone: '',
    postalCode: '',
    isDefault: false,
    remark: '',
  };
}

export function createEmptyBank() {
  return {
    id: createLineId('bank'),
    accountName: '',
    accountNo: '',
    bankName: '',
    branchName: '',
    bankCode: '',
    currency: '',
    isDefault: false,
    remark: '',
  };
}

export function createEmptyBusinessInfo() {
  return {
    companyName: '',
    taxNo: '',
    registeredAddress: '',
    registeredPhone: '',
    bankName: '',
    bankAccount: '',
  };
}
