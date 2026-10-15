import {
  DocumentListPage,
} from '../components/erp/DocumentListPage.jsx';
import { matchesDateRange, matchesTextContains } from '../lib/listFilters.js';
import {
  canApprove,
  canDisable,
  canEditLogical,
  canEditPhysical,
  canEnable,
  canReject,
  canSubmitAudit,
  canUnapprove,
} from '../lib/warehouseLogic.js';
import { buildInitialVisibility } from '../data/warehouseData.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../lib/mockStorage.js';

export const physicalInitialFilters = {
  code: '',
  name: '',
  thirdPartyCode: '',
  operationType: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

export const logicalInitialFilters = {
  code: '',
  name: '',
  physicalWarehouseId: '',
  stockStatus: '',
  useStatus: '',
  auditStatus: '',
  updatedAt: { from: '', to: '' },
};

export const auditTabItems = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '审核通过' },
  { value: 'rejected', label: '已驳回' },
];

export function filterPhysicalRows(row, filters) {
  return matchesTextContains(row.code, filters.code)
    && matchesTextContains(row.name, filters.name)
    && matchesTextContains(row.thirdPartyCode, filters.thirdPartyCode)
    && (!filters.operationType || row.operationType === filters.operationType)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function filterLogicalRows(row, filters) {
  return matchesTextContains(row.code, filters.code)
    && matchesTextContains(row.name, filters.name)
    && (!filters.physicalWarehouseId || row.physicalWarehouseId === filters.physicalWarehouseId)
    && (!filters.stockStatus || row.stockStatus === filters.stockStatus)
    && (!filters.useStatus || row.useStatus === filters.useStatus)
    && (!filters.auditStatus || row.auditStatus === filters.auditStatus)
    && matchesDateRange(row.updatedAt, filters.updatedAt);
}

export function buildPhysicalRowActions() {
  return [
    { id: 'edit', label: '编辑', visibleWhen: (row) => canEditPhysical(row) },
    { id: 'submit', label: '提交审核', visibleWhen: (row) => canSubmitAudit(row) },
    { id: 'approve', label: '审核通过', visibleWhen: (row) => canApprove(row) },
    { id: 'reject', label: '驳回', variant: 'danger', visibleWhen: (row) => canReject(row) },
    { id: 'unapprove', label: '反审核', visibleWhen: (row) => canUnapprove(row) },
    { id: 'enable', label: '启用', visibleWhen: (row) => canEnable(row) },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: (row) => canDisable(row) },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

export function buildLogicalRowActions() {
  return [
    { id: 'edit', label: '编辑', visibleWhen: (row) => canEditLogical(row) },
    { id: 'submit', label: '提交审核', visibleWhen: (row) => canSubmitAudit(row) },
    { id: 'approve', label: '审核通过', visibleWhen: (row) => canApprove(row) },
    { id: 'reject', label: '驳回', variant: 'danger', visibleWhen: (row) => canReject(row) },
    { id: 'unapprove', label: '反审核', visibleWhen: (row) => canUnapprove(row) },
    { id: 'enable', label: '启用', visibleWhen: (row) => canEnable(row) },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: (row) => canDisable(row) },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

/**
 * 仓库主数据列表：审计页签 + 批量审核。
 * 列表接线统一走 DocumentListPage，这里只做页面 props → config 的适配（查询提示、页签、批量操作签名）。
 */
export function WarehouseObjectList({
  title,
  rows,
  storageKey,
  columns,
  initialFilters,
  filterFields,
  filterRows,
  headerActions,
  toolbarActions,
  onToolbarAction,
  onCellClick,
  onRowAction,
  rowActions,
  defaultSort,
  emptyText,
  emptyTextFiltered,
  onFeedback,
  onOpenPage,
}) {
  return (
    <DocumentListPage
      onFeedback={onFeedback}
      onOpenPage={onOpenPage}
      config={{
        title,
        rows,
        storageKey,
        columns,
        initialFilters,
        filterFields,
        filterRows,
        initialVisibility: buildInitialVisibility(columns),
        defaultSort: defaultSort || { key: 'updatedAt', direction: 'desc' },
        headerActions,
        onHeaderAction: (id, actionContext) => {
          const action = headerActions.find((item) => item.id === id);
          action?.onAction?.(actionContext);
        },
        queryMessage: '已执行仓库查询',
        tabs: { filterKey: 'auditStatus', items: auditTabItems },
        toolbarActions: toolbarActions || [],
        onToolbarAction: (id, actionContext) => onToolbarAction?.(id, actionContext.getSelectedRows(), actionContext),
        columnOptions: columns.map((column) => ({ key: column.key, label: column.label })),
        emptyText: emptyText || '暂无数据',
        emptyTextFiltered: emptyTextFiltered || '没有符合条件的记录，请调整筛选条件',
        onCellClick,
        onRowAction,
        rowActions,
        rowActionsMaxVisible: 3,
      }}
    />
  );
}

export function subscribeMockRowsLocal(storageKey, setter, fallback) {
  setter(readMockRows(storageKey, fallback));
  return subscribeMockRows(storageKey, setter);
}

export function upsertMockRowLocal(storageKey, row, setter, fallback) {
  const rows = readMockRows(storageKey, fallback);
  const index = rows.findIndex((item) => item.id === row.id);
  const nextRows = index < 0 ? [row, ...rows] : rows.map((item, itemIndex) => (itemIndex === index ? row : item));
  writeMockRows(storageKey, nextRows);
  setter(nextRows);
}

export function removeMockRowLocal(storageKey, rowId, setter, fallback) {
  const nextRows = readMockRows(storageKey, fallback).filter((item) => item.id !== rowId);
  writeMockRows(storageKey, nextRows);
  setter(nextRows);
}
