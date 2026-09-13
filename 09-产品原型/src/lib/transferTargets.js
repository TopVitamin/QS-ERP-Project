import { inboundOrders, inboundStatusLabels } from '../data/inboundData.js';
import { orderStatusLabels, orders } from '../data/orderData.js';
import { warehouseStatusLabels, warehouses } from '../data/warehouseData.js';
import { readMockRows } from './mockStorage.js';

function toOptions(labels) {
  return Object.entries(labels).map(([value, label]) => ({ value, label }));
}

const warehouseFields = [
  { key: 'code', label: '实体仓编码', required: true, example: 'WH-SZ-002' },
  { key: 'name', label: '实体仓名称', required: true, example: '深圳仓二分部' },
  { key: 'operationType', label: '运营类型', options: [{ value: '自营', label: '自营' }, { value: '第三方', label: '第三方' }] },
  { key: 'dockingType', label: '对接方式', options: [{ value: '直连', label: '直连' }, { value: 'SaaS中转', label: 'SaaS中转' }] },
  { key: 'dockingSystem', label: '对接系统', options: [{ value: '仓库作业系统', label: '仓库作业系统' }, { value: '聚水潭', label: '聚水潭' }, { value: '领星', label: '领星' }] },
  { key: 'address', label: '仓库地址', example: '广东省深圳市宝安区福永街道物流园 4 号库' },
  { key: 'contact', label: '联系人', example: '阿盛' },
  { key: 'phone', label: '联系电话', example: '0755-8888 3202' },
  { key: 'useStatus', label: '使用状态', options: toOptions({ enabled: '启用', disabled: '禁用' }), example: '启用' },
  { key: 'auditStatus', label: '审核状态', importable: false, options: toOptions(warehouseStatusLabels) },
  { key: 'updatedAt', label: '更新时间', importable: false },
];

const purchaseOrderFields = [
  { key: 'date', label: '单据日期' },
  { key: 'mode', label: '业务模式' },
  { key: 'orderNo', label: '单据编号' },
  { key: 'supplier', label: '供应商' },
  { key: 'settleSupplier', label: '结算供应商' },
  { key: 'settlePeriod', label: '结算期限' },
  { key: 'currency', label: '币别' },
  { key: 'salesman', label: '业务员' },
  { key: 'department', label: '部门' },
  { key: 'auditStatus', label: '审核状态', options: toOptions(orderStatusLabels.auditStatus) },
  { key: 'executionStatus', label: '执行状态', options: toOptions(orderStatusLabels.executionStatus) },
  { key: 'inboundStatus', label: '入库状态', options: toOptions(orderStatusLabels.inboundStatus) },
  { key: 'closeStatus', label: '关闭状态', options: toOptions(orderStatusLabels.closeStatus) },
  { key: 'paymentStatus', label: '订单付款状态', options: toOptions(orderStatusLabels.paymentStatus) },
  { key: 'amount', label: '成交金额' },
  { key: 'executedAmount', label: '已执行金额' },
];

const purchaseInboundFields = [
  { key: 'date', label: '单据日期' },
  { key: 'inboundNo', label: '入库单号' },
  { key: 'relatedOrderNo', label: '关联采购订单' },
  { key: 'supplier', label: '供应商' },
  { key: 'currency', label: '币别' },
  { key: 'warehouse', label: '入库仓库' },
  { key: 'inboundType', label: '入库类型' },
  { key: 'status', label: '入库状态', options: toOptions(inboundStatusLabels) },
  { key: 'operator', label: '经办人' },
  { key: 'quantity', label: '入库数量' },
  { key: 'amount', label: '入库金额' },
];

export const transferTargets = [
  {
    id: 'warehouse',
    label: '仓库档案',
    storageKey: 'qs-erp:warehouses:v1',
    seedRows: warehouses,
    fileName: '仓库档案',
    keyField: 'code',
    keyLabel: '实体仓编码',
    auditField: 'auditStatus',
    auditDraftValue: 'draft',
    importDefaults: { useStatus: 'disabled' },
    importable: true,
    sampleRows: [
      ['WH-XM-001', '厦门仓', '自营', '直连', '仓库作业系统', '福建省厦门市湖里区物流园 2 号库', '陈仓管', '0592-6666 1000', '启用'],
      ['WH-XM-002', '厦门海沧仓', '第三方', 'SaaS中转', '领星', '福建省厦门市海沧区保税物流中心', '周磊', '', '禁用'],
      ['WH-XM-003', '', '第三方', '直连', '宇宙仓系统', '福建省厦门市集美区某仓', '测试', '', '启用'],
      ['WH-XM-001', '重复编码行', '自营', '直连', '聚水潭', '重复编码测试地址', '测试', '', '禁用'],
    ],
    fields: warehouseFields,
  },
  {
    id: 'purchase-order',
    label: '采购订单',
    storageKey: 'qs-erp:purchase-orders:v1',
    seedRows: orders,
    fileName: '采购订单',
    keyField: 'orderNo',
    keyLabel: '单据编号',
    importable: false,
    fields: purchaseOrderFields,
  },
  {
    id: 'purchase-inbound',
    label: '采购入库单',
    storageKey: 'qs-erp:purchase-inbounds:v1',
    seedRows: inboundOrders,
    fileName: '采购入库单',
    keyField: 'inboundNo',
    keyLabel: '入库单号',
    importable: false,
    fields: purchaseInboundFields,
  },
];

export function getTransferTarget(id) {
  return transferTargets.find((target) => target.id === id) || null;
}

export function getImportFields(target) {
  return target.fields.filter((field) => field.importable !== false);
}

export function getExportFields(target) {
  return target.fields.filter((field) => field.exportable !== false);
}

export function readTargetRows(target) {
  return readMockRows(target.storageKey, target.seedRows || []);
}

export function exportFieldValue(field, row) {
  const raw = row?.[field.key];
  if (raw == null || raw === '') return '';
  if (field.options) return field.options.find((option) => option.value === raw)?.label ?? String(raw);
  return String(raw);
}

function normalizeImportValue(value) {
  const text = String(value ?? '').trim();
  return text === '—' ? '' : text;
}

export function validateImportRows(target, headers, rows) {
  const fields = getImportFields(target);
  const fieldByLabel = new Map(fields.map((field) => [field.label, field]));
  const requiredFields = fields.filter((field) => field.required);
  const missingColumns = requiredFields.filter((field) => !headers.includes(field.label)).map((field) => field.label);
  const unknownColumns = headers.filter((header) => header && !fieldByLabel.has(header));
  const existingKeys = new Set(readTargetRows(target).map((row) => String(row[target.keyField] ?? '')));
  const seenKeys = new Set();

  const items = rows.map((cells, index) => {
    const values = {};
    const errors = [];
    headers.forEach((header, cellIndex) => {
      const field = fieldByLabel.get(header);
      if (!field) return;
      const value = normalizeImportValue(cells[cellIndex]);
      if (value) values[field.key] = value;
    });
    requiredFields.forEach((field) => {
      if (!values[field.key]) errors.push(`「${field.label}」不能为空`);
    });
    fields.forEach((field) => {
      const value = values[field.key];
      if (!value || !field.options) return;
      const option = field.options.find((item) => item.label === value || item.value === value);
      if (option) values[field.key] = option.value;
      else errors.push(`「${field.label}」不在可选值范围`);
    });

    const keyValue = values[target.keyField];
    let action = 'create';
    if (keyValue) {
      if (seenKeys.has(keyValue)) errors.push(`「${target.keyLabel}」在文件内重复`);
      seenKeys.add(keyValue);
      if (existingKeys.has(keyValue)) action = 'update';
    }

    return { rowNumber: index + 2, values, action: errors.length ? 'error' : action, errors };
  });

  const summary = {
    total: items.length,
    create: items.filter((item) => item.action === 'create').length,
    update: items.filter((item) => item.action === 'update').length,
    error: items.filter((item) => item.action === 'error').length,
  };

  return {
    items,
    summary,
    unknownColumns,
    headerErrors: missingColumns.map((label) => `缺少必填列「${label}」`),
  };
}
