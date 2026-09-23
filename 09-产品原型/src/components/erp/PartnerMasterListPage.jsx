import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { DocumentListPage } from './DocumentListPage.jsx';
import { ImportExportActions } from './ImportExportActions.jsx';
import { PartnerActionDialogs } from './PartnerActionDialogs.jsx';
import { getTransferTarget } from '../../lib/transferTargets.js';
import { readMockRows, subscribeMockRows, writeMockRows } from '../../lib/mockStorage.js';
import {
  applyEnable,
  canApprove,
  canDisable,
  canEditPartner,
  canEnable,
  canReject,
  canSubmitAudit,
  canUnapprove,
  getBatchAuditBlockReason,
} from '../../lib/partnerMasterLogic.js';
import { useEffect } from 'react';

const auditTabItems = [
  { value: '', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '审核通过' },
  { value: 'rejected', label: '已驳回' },
];

function buildRowActions() {
  return [
    { id: 'edit', label: '编辑', visibleWhen: (row) => canEditPartner(row) },
    { id: 'submit', label: '提交审核', visibleWhen: (row) => canSubmitAudit(row) },
    { id: 'approve', label: '审核通过', visibleWhen: (row) => canApprove(row) },
    { id: 'reject', label: '驳回', variant: 'danger', visibleWhen: (row) => canReject(row) },
    { id: 'unapprove', label: '反审核', visibleWhen: (row) => canUnapprove(row) },
    { id: 'enable', label: '启用', visibleWhen: (row) => canEnable(row) },
    { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: (row) => canDisable(row) },
    { id: 'delete', label: '删除', variant: 'danger' },
  ];
}

export function PartnerMasterListPage({
  title,
  entityName,
  storageKey,
  seedRows,
  columns,
  initialFilters,
  filterFields,
  filterRows,
  transferTargetId,
  createPageId,
  editPageId,
  detailPageId,
  onFeedback,
  onOpenPage,
}) {
  const [rows, setRows] = useState(() => readMockRows(storageKey, seedRows));
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    setRows(readMockRows(storageKey, seedRows));
    return subscribeMockRows(storageKey, setRows);
  }, [storageKey, seedRows]);

  const initialVisibility = useMemo(() => Object.fromEntries(columns.map((column) => [column.key, column.defaultVisible !== false])), [columns]);
  const columnOptions = useMemo(() => columns.map((column) => ({ key: column.key, label: column.label })), [columns]);

  function upsertRow(nextRow) {
    const current = readMockRows(storageKey, seedRows);
    const index = current.findIndex((item) => item.id === nextRow.id);
    const nextRows = index < 0 ? [nextRow, ...current] : current.map((item, itemIndex) => (itemIndex === index ? nextRow : item));
    writeMockRows(storageKey, nextRows);
    setRows(nextRows);
  }

  function removeRow(rowId) {
    const nextRows = readMockRows(storageKey, seedRows).filter((item) => item.id !== rowId);
    writeMockRows(storageKey, nextRows);
    setRows(nextRows);
  }

  function handleDialogComplete(result) {
    if (!result) return;
    if (result.action === 'batch-delete' && result.rows) {
      const ids = new Set(result.rows.map((item) => item.id));
      const nextRows = readMockRows(storageKey, seedRows).filter((item) => !ids.has(item.id));
      writeMockRows(storageKey, nextRows);
      setRows(nextRows);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action?.startsWith('batch-') && result.nextRows) {
      const byId = new Map(result.nextRows.map((item) => [item.id, item]));
      const nextRows = readMockRows(storageKey, seedRows).map((item) => byId.get(item.id) || item);
      writeMockRows(storageKey, nextRows);
      setRows(nextRows);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.action === 'delete' && result.row) {
      removeRow(result.row.id);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }
    if (result.nextRow) upsertRow(result.nextRow);
    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  const listConfig = {
    title,
    rows,
    storageKey,
    initialFilters,
    filterRows,
    initialVisibility,
    columns,
    columnOptions,
    filterFields,
    defaultSort: { key: 'updatedAt', direction: 'desc' },
    headerActions: [
      { id: 'create', label: '新增', icon: Plus, variant: 'primary' },
      {
        id: 'import-export',
        render: (ctx) => (
          <ImportExportActions
            target={getTransferTarget(transferTargetId)}
            scopeSource={{ all: rows, filtered: ctx.state.filteredRows, selected: ctx.getSelectedRows() }}
            defaultColumnKeys={columns.filter((column) => ctx.state.visibility[column.key] !== false).map((column) => column.key)}
            notify={onFeedback}
            onOpenPage={onOpenPage}
          />
        ),
      },
    ],
    tabs: {
      filterKey: 'auditStatus',
      items: auditTabItems,
    },
    toolbarActions: [
      { id: 'batch-submit', label: '批量提交审核', requiresSelection: true },
      { id: 'batch-approve', label: '批量审核通过', requiresSelection: true },
      { id: 'batch-reject', label: '批量驳回', requiresSelection: true, variant: 'danger' },
      { id: 'batch-delete', label: '批量删除', requiresSelection: true, variant: 'danger' },
    ],
    emptyText: `暂无${entityName}资料，点击「新增」开始建档`,
    emptyTextFiltered: `没有符合条件的${entityName}，请调整筛选条件`,
    onToolbarAction: (id, { notify, getSelectedRows }) => {
      const selectedRows = getSelectedRows();
      if (id !== 'batch-delete') {
        const blockReason = getBatchAuditBlockReason(selectedRows, id);
        if (blockReason) {
          notify(blockReason, 'warning');
          return;
        }
      }
      setDialog({ type: id, rows: selectedRows });
    },
    rowActions: buildRowActions(),
    rowActionsMaxVisible: 3,
    resetMessage: '筛选条件已重置',
    queryMessage: `已执行${entityName}查询`,
    onHeaderAction: (id) => {
      if (id === 'create') onOpenPage?.(createPageId);
    },
    onCellClick: (column, row) => {
      if (column.key === 'code') onOpenPage?.(detailPageId, { row });
    },
    onRowAction: (id, row) => {
      if (id === 'edit') {
        if (!canEditPartner(row)) {
          setDialog({ type: 'blocked-edit', row });
          return;
        }
        onOpenPage?.(editPageId, { row });
        return;
      }
      if (id === 'enable') {
        upsertRow(applyEnable(row));
        onFeedback?.(`${entityName}已启用；仅审核通过时可供引用`, 'success');
        return;
      }
      setDialog({ type: id, row });
    },
  };

  return (
    <>
      <DocumentListPage onFeedback={onFeedback} onOpenPage={onOpenPage} config={listConfig} />
      <PartnerActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        entityName={entityName}
      />
    </>
  );
}
