import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { DataTable } from '../components/erp/DataTable.jsx';
import { DetailField, DocumentDetailFrame, EditorCard } from '../components/erp/DocumentDetailFrame.jsx';
import { WarehouseActionDialogs } from '../components/erp/WarehouseActionDialogs.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { EMPTY_PLACEHOLDER } from '../lib/format.js';
import { readMockRows, subscribeMockRows, upsertMockRow, writeMockRows } from '../lib/mockStorage.js';
import {
  applyEnable,
  buildPhysicalStatusBadges,
  canApprove,
  canDisable,
  canEditLogical,
  canEditPhysical,
  canEnable,
  canReject,
  canSubmitAudit,
  canUnapprove,
  LOGICAL_STORAGE_KEY,
  physicalAuditLabels,
  PHYSICAL_STORAGE_KEY,
  useStatusLabels,
} from '../lib/warehouseLogic.js';
import {
  logicalWarehouseColumns,
  logicalWarehouses,
  physicalWarehouses,
} from '../data/warehouseData.js';

function buildDetailFields(row) {
  return [
    { key: 'code', label: '实体仓编码', value: row.code },
    { key: 'name', label: '实体仓名称', value: row.name },
    { key: 'operationType', label: '运营类型', value: row.operationType || EMPTY_PLACEHOLDER },
    { key: 'remark', label: '备注', value: row.remark || EMPTY_PLACEHOLDER, className: 'col-span-3' },
    { key: 'address', label: '仓库地址', value: row.address || EMPTY_PLACEHOLDER },
    { key: 'contact', label: '联系人', value: row.contact || EMPTY_PLACEHOLDER },
    { key: 'phone', label: '联系电话', value: row.phone || EMPTY_PLACEHOLDER },
    { key: 'dockingType', label: '对接方式', value: row.dockingType || EMPTY_PLACEHOLDER },
    { key: 'dockingSystem', label: '对接系统', value: row.dockingSystem || EMPTY_PLACEHOLDER },
    { key: 'thirdPartyCode', label: '第三方仓库编码', value: row.thirdPartyCode || EMPTY_PLACEHOLDER },
    { key: 'thirdPartyOwner', label: '第三方仓库货主', value: row.thirdPartyOwner || EMPTY_PLACEHOLDER },
    { key: 'authConfig', label: '对接授权配置', value: row.authConfig || EMPTY_PLACEHOLDER },
    { key: 'auditStatus', label: '审核状态', value: physicalAuditLabels[row.auditStatus] || EMPTY_PLACEHOLDER },
    { key: 'useStatus', label: '使用状态', value: useStatusLabels[row.useStatus] || EMPTY_PLACEHOLDER },
    { key: 'auditor', label: '审核人', value: row.auditor || EMPTY_PLACEHOLDER },
    { key: 'auditedAt', label: '审核时间', value: row.auditedAt || EMPTY_PLACEHOLDER },
    { key: 'creator', label: '创建人', value: row.creator || EMPTY_PLACEHOLDER },
    { key: 'createdAt', label: '创建时间', value: row.createdAt || EMPTY_PLACEHOLDER },
    { key: 'updater', label: '最后更新人', value: row.updater || EMPTY_PLACEHOLDER },
    { key: 'updatedAt', label: '最后更新时间', value: row.updatedAt || EMPTY_PLACEHOLDER },
  ];
}

// DataTable 的 rowActions 需为数组、按 visibleWhen 逐行判断；此前按函数传入会导致子表渲染报错。
const logicalRowActions = [
  { id: 'view', label: '查看' },
  { id: 'edit', label: '编辑', visibleWhen: (row) => canEditLogical(row) },
  { id: 'submit', label: '提交审核', visibleWhen: (row) => canSubmitAudit(row) },
  { id: 'approve', label: '审核通过', visibleWhen: (row) => canApprove(row) },
  { id: 'reject', label: '驳回', variant: 'danger', visibleWhen: (row) => canReject(row) },
  { id: 'unapprove', label: '反审核', visibleWhen: (row) => canUnapprove(row) },
  { id: 'enable', label: '启用', visibleWhen: (row) => canEnable(row) },
  { id: 'disable', label: '禁用', variant: 'danger', visibleWhen: (row) => canDisable(row) },
  { id: 'delete', label: '删除', variant: 'danger' },
];

export function WarehouseDetailPage({ context, onFeedback, onOpenPage }) {
  const returnPageId = context?.returnPageId || 'warehouse-physical';
  const [physicalRows, setPhysicalRows] = useState(() => readMockRows(PHYSICAL_STORAGE_KEY, physicalWarehouses));
  const [logicalRows, setLogicalRows] = useState(() => readMockRows(LOGICAL_STORAGE_KEY, logicalWarehouses));
  const [dialog, setDialog] = useState(null);

  const row = useMemo(() => {
    const source = context?.row;
    if (!source) return null;
    return physicalRows.find((item) => item.id === source.id) || source;
  }, [context?.row, physicalRows]);

  useEffect(() => subscribeMockRows(PHYSICAL_STORAGE_KEY, setPhysicalRows), []);
  useEffect(() => subscribeMockRows(LOGICAL_STORAGE_KEY, setLogicalRows), []);

  const childLogicalRows = useMemo(
    () => logicalRows.filter((item) => item.physicalWarehouseId === row?.id).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))),
    [logicalRows, row?.id],
  );

  const logicalColumns = useMemo(() => logicalWarehouseColumns.filter((column) => column.key !== 'physicalWarehouseId'), []);

  if (!row) {
    return (
      <main className="flex min-h-0 flex-1 items-center justify-center bg-erp-surface text-erp-text-muted">
        未找到实体仓记录
      </main>
    );
  }

  const canCreateLogical = row.auditStatus === 'approved' && row.useStatus === 'enabled';

  function openDialog(payload) {
    setDialog({ ...payload, objectType: payload.objectType || 'physical', row });
  }

  function handleHeaderAction(id) {
    if (id === 'edit') {
      if (!canEditPhysical(row)) {
        setDialog({ type: 'blocked-edit', row });
        return;
      }
      onOpenPage?.('warehouse-edit', { row });
      return;
    }
    if (id === 'submit') return openDialog({ type: 'submit' });
    if (id === 'approve') return openDialog({ type: 'approve' });
    if (id === 'reject') return openDialog({ type: 'reject', objectType: 'physical' });
    if (id === 'unapprove') return openDialog({ type: 'unapprove' });
    if (id === 'enable') {
      upsertMockRow(PHYSICAL_STORAGE_KEY, applyEnable(row));
      onFeedback?.('实体仓已启用；仅审核通过时可供新增逻辑仓引用', 'success');
      return;
    }
    if (id === 'disable') return openDialog({ type: 'disable', objectType: 'physical' });
    if (id === 'delete') return openDialog({ type: 'delete', objectType: 'physical' });
    if (id === 'add-logical') {
      if (!canCreateLogical) {
        setDialog({ type: 'blocked-add-logical' });
        return;
      }
      setDialog({
        type: 'logical-form',
        mode: 'create',
        defaultPhysicalWarehouseId: row.id,
        physicalRows,
        existingRows: logicalRows,
      });
    }
  }

  function handleLogicalRowAction(id, logicalRow) {
    if (id === 'view') {
      setDialog({ type: 'logical-form', mode: 'view', row: logicalRow, physicalRows, existingRows: logicalRows });
      return;
    }
    if (id === 'edit') {
      if (!canEditLogical(logicalRow)) {
        setDialog({ type: 'blocked-edit-logical', logicalRow });
        return;
      }
      setDialog({ type: 'logical-form', mode: 'edit', row: logicalRow, physicalRows, existingRows: logicalRows });
      return;
    }
    if (id === 'enable') {
      upsertMockRow(LOGICAL_STORAGE_KEY, applyEnable(logicalRow));
      onFeedback?.('逻辑仓已启用；仅审核通过时可供业务单据引用', 'success');
      return;
    }
    setDialog({ type: id, logicalRow, row, objectType: 'logical' });
  }

  function handleDialogComplete(result) {
    if (!result) return;

    if (result.action === 'save-logical' && result.payload) {
      upsertMockRow(LOGICAL_STORAGE_KEY, result.payload);
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.action === 'delete' && result.row) {
      if (result.objectType === 'logical' || result.row.id?.startsWith('logical-')) {
        writeMockRows(LOGICAL_STORAGE_KEY, logicalRows.filter((item) => item.id !== result.row.id));
      } else {
        writeMockRows(PHYSICAL_STORAGE_KEY, physicalRows.filter((item) => item.id !== result.row.id));
        onOpenPage?.(returnPageId);
      }
      onFeedback?.(result.message, result.type || 'success');
      return;
    }

    if (result.nextRow) {
      const isLogical = Boolean(result.logicalRow) || result.row?.id?.startsWith('logical-') || dialog?.objectType === 'logical';
      const nextRow = isLogical
        ? { ...(result.logicalRow || result.row), ...result.nextRow, id: (result.logicalRow || result.row)?.id }
        : { ...result.row, ...result.nextRow, id: result.row?.id };
      upsertMockRow(isLogical ? LOGICAL_STORAGE_KEY : PHYSICAL_STORAGE_KEY, nextRow);
    }

    if (result.message) onFeedback?.(result.message, result.type || 'success');
  }

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      {canEditPhysical(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('edit')}>编辑</Button>}
      {canSubmitAudit(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('submit')}>提交审核</Button>}
      {canApprove(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('approve')}>审核通过</Button>}
      {canReject(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('reject')}>驳回</Button>}
      {canUnapprove(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('unapprove')}>反审核</Button>}
      {canEnable(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('enable')}>启用</Button>}
      {canDisable(row) && <Button variant="outline" size="compact" onClick={() => handleHeaderAction('disable')}>禁用</Button>}
      <Button
        variant="outline"
        size="compact"
        disabled={!canCreateLogical}
        title={!canCreateLogical ? '实体仓审核通过并启用后才能新增逻辑仓' : undefined}
        onClick={() => handleHeaderAction('add-logical')}
      >
        新增逻辑仓
      </Button>
    </div>
  );

  const fields = buildDetailFields(row);
  const baseFields = fields.slice(0, 4);
  const addressFields = fields.slice(4, 7);
  const dockingFields = fields.slice(7, 12);
  const statusFields = fields.slice(12, 14);
  const metaFields = fields.slice(14);

  return (
    <>
      <DocumentDetailFrame
        title={row.code}
        statuses={buildPhysicalStatusBadges(row)}
        headerActions={headerActions}
        onBack={() => onOpenPage?.(returnPageId)}
      >
        <EditorCard title="基础信息">
          <div className={erpFieldGridClassName}>
            {baseFields.map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
        <EditorCard title="地址与联系">
          <div className={erpFieldGridClassName}>
            {addressFields.map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
        <EditorCard title="对接信息">
          <div className={erpFieldGridClassName}>
            {dockingFields.map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
        <EditorCard
          title="逻辑仓"
          actions={(
            <Button variant="outline" size="compact" disabled={!canCreateLogical} onClick={() => handleHeaderAction('add-logical')}>
              <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
              新增逻辑仓
            </Button>
          )}
        >
          {childLogicalRows.length ? (
            <DataTable
              rows={childLogicalRows}
              columns={logicalColumns}
              rowActions={logicalRowActions}
              rowActionsMaxVisible={3}
              onRowAction={handleLogicalRowAction}
              onCellClick={(column, logicalRow) => {
                if (column.key === 'code') handleLogicalRowAction('view', logicalRow);
              }}
            />
          ) : (
            <div className="px-4 py-8 text-center text-[12px] text-erp-text-muted">
              暂无逻辑仓，实体仓审核通过并启用后可以新增
            </div>
          )}
        </EditorCard>
        <EditorCard title="审核与使用">
          <div className={erpFieldGridClassName}>
            {statusFields.map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
        <EditorCard title="维护信息">
          <div className={erpFieldGridClassName}>
            {metaFields.map((field) => <DetailField key={field.key} {...field} />)}
          </div>
        </EditorCard>
      </DocumentDetailFrame>
      <WarehouseActionDialogs
        dialog={dialog}
        onClose={() => setDialog(null)}
        onComplete={handleDialogComplete}
        physicalRows={physicalRows}
        logicalRows={logicalRows}
      />
    </>
  );
}
