import { useMemo } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import {
  buildMasterDataDialogTitle,
  buildMetaViewFields,
  DialogLeaveConfirm,
  masterDataDialogFullSpanClassName,
  MasterDataFormDialog,
  useDialogFormState,
} from './MasterDataFormDialog.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { formatCodeName } from '../../lib/codeName.js';
import {
  applyApprove,
  applyBatchAudit,
  applyDisable,
  applyEnable,
  applyReject,
  applySubmit,
  applyUnapprove,
  buildLogicalStatusBadges,
  canEditLogical,
  createEmptyLogicalForm,
  getBatchDeleteBlockedRows,
  getDeleteBlockReasonLogical,
  getDeleteBlockReasonPhysical,
  physicalAuditLabels,
  stockStatusLabels,
  stockStatusOptions,
  validateLogicalForSave,
} from '../../lib/warehouseLogic.js';
import { resolvePhysicalLabel } from '../../data/warehouseData.js';
import { StatusBadge } from './StatusBadge.jsx';

function logicalRowToForm(item) {
  return {
    code: item.code,
    name: item.name,
    physicalWarehouseId: item.physicalWarehouseId,
    stockStatus: item.stockStatus,
    remark: item.remark || '',
  };
}

function LogicalWarehouseFormDialog({ dialog, onClose, onComplete }) {
  const { mode, row, physicalRows, defaultPhysicalWarehouseId, existingRows } = dialog;
  const isEdit = mode === 'edit';
  const {
    form,
    fieldErrors,
    setFieldErrors,
    dirty,
    updateField,
  } = useDialogFormState({
    row,
    mode,
    toForm: logicalRowToForm,
    createEmpty: () => createEmptyLogicalForm(defaultPhysicalWarehouseId),
    deps: [defaultPhysicalWarehouseId],
  });

  const eligiblePhysicalOptions = useMemo(() => {
    const approved = physicalRows.filter((item) => item.auditStatus === 'approved' && item.useStatus === 'enabled');
    const current = physicalRows.find((item) => item.id === form.physicalWarehouseId);
    const merged = current && !approved.some((item) => item.id === current.id) ? [current, ...approved] : approved;
    return merged.map((item) => ({ value: item.id, label: formatCodeName(item.code, item.name) }));
  }, [physicalRows, form.physicalWarehouseId]);

  function handleSave() {
    const result = validateLogicalForSave(form, existingRows, row?.id);
    if (result?.fieldErrors) {
      setFieldErrors(result.fieldErrors);
      return;
    }
    onComplete?.({
      message: '逻辑仓已保存',
      type: 'success',
      action: 'save-logical',
      payload: {
        ...row,
        ...form,
        id: row?.id || `logical-warehouse-${Date.now()}`,
        useStatus: row?.useStatus || 'enabled',
        auditStatus: row?.auditStatus || 'draft',
        creator: row?.creator || '当前用户',
        createdAt: row?.createdAt || new Date().toISOString().slice(0, 16).replace('T', ' '),
        updater: '当前用户',
        updatedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        referenced: row?.referenced || false,
      },
    });
    onClose?.();
  }

  const badges = buildLogicalStatusBadges(row);
  const fields = [
    { key: 'code', label: '逻辑仓编码', type: 'text', placeholder: '请输入逻辑仓编码', disabled: isEdit },
    { key: 'name', label: '逻辑仓名称', type: 'text', placeholder: '请输入逻辑仓名称' },
    { key: 'physicalWarehouseId', label: '所属实体仓 *', type: 'select', options: eligiblePhysicalOptions, placeholder: '请选择所属实体仓' },
    { key: 'stockStatus', label: '库存状态 *', type: 'select', options: stockStatusOptions, placeholder: '请选择库存状态' },
    { key: 'remark', label: '备注', type: 'textarea', placeholder: '请输入逻辑仓说明', className: masterDataDialogFullSpanClassName },
  ];

  const viewSections = [
    {
      title: '基础信息',
      fields: [
        { label: '逻辑仓编码', value: row.code },
        { label: '逻辑仓名称', value: row.name },
        { label: '所属实体仓', value: resolvePhysicalLabel(row.physicalWarehouseId, physicalRows) },
        { label: '库存状态', value: stockStatusLabels[row.stockStatus] || EMPTY_PLACEHOLDER },
        { label: '备注', value: row.remark || EMPTY_PLACEHOLDER, className: masterDataDialogFullSpanClassName },
      ],
    },
    {
      title: '维护信息',
      fields: buildMetaViewFields(row, [
        { label: '审核人', value: row.auditor },
        { label: '审核时间', value: row.auditedAt },
      ]),
    },
  ];

  return (
    <MasterDataFormDialog
      mode={mode}
      title={buildMasterDataDialogTitle('逻辑仓', mode)}
      titleExtra={(
        <div className="flex flex-wrap items-center gap-1.5">
          {badges.map((item) => <StatusBadge key={item.label} tone={item.tone}>{item.label}</StatusBadge>)}
        </div>
      )}
      onClose={onClose}
      onSave={handleSave}
      dirty={dirty}
      form={form}
      fields={fields}
      fieldErrors={fieldErrors}
      onFieldChange={updateField}
      viewSections={viewSections}
    />
  );
}

export function WarehouseActionDialogs({ dialog, onClose, onComplete, physicalRows = [], logicalRows = [] }) {
  if (!dialog) return null;

  const { type, row, logicalRow } = dialog;

  function finish(message, tone = 'success', payload) {
    onComplete?.({ message, type: tone, ...payload });
    onClose?.();
  }

  if (type === 'logical-form') {
    return <LogicalWarehouseFormDialog dialog={dialog} onClose={onClose} onComplete={onComplete} />;
  }

  if (type === 'confirm-leave' || type === 'confirm-leave-logical') {
    return (
      <DialogLeaveConfirm
        onCancel={onClose}
        onConfirm={() => {
          dialog.onConfirmLeave?.();
          onClose?.();
        }}
      />
    );
  }

  const targetRow = logicalRow || row;

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交当前记录？"
        description="提交后进入待审核状态，由资料审核人处理"
        confirmLabel="确认提交"
        onConfirm={() => finish('已提交审核，等待审核', 'success', { action: 'submit', row: targetRow, nextRow: applySubmit(targetRow) })}
      />
    );
  }

  if (type === 'approve') {
    const label = dialog.objectType === 'logical' ? '逻辑仓已审核通过' : '实体仓已审核通过';
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核通过当前记录？"
        description="仅审核通过且使用状态为启用时可供新增引用"
        confirmLabel="确认通过"
        onConfirm={() => finish(label, 'success', { action: 'approve', row: targetRow, nextRow: applyApprove(targetRow) })}
      />
    );
  }

  if (type === 'reject') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认驳回当前记录？"
        description="驳回后可以修改资料并重新提交；一期不录入驳回意见"
        confirmLabel="确认驳回"
        confirmVariant="danger"
        onConfirm={() => finish('已驳回，可修改后重新提交', 'success', { action: 'reject', row: targetRow, nextRow: applyReject(targetRow) })}
      />
    );
  }

  if (type === 'unapprove') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认反审核当前记录？"
        description="反审核后回到草稿；修改后须重新提交审核，重新审核通过前不能供新增引用"
        confirmLabel="确认反审核"
        onConfirm={() => finish('已反审核，可修改后重新提交审核', 'success', { action: 'unapprove', row: targetRow, nextRow: applyUnapprove(targetRow) })}
      />
    );
  }

  if (type === 'disable') {
    const description = dialog.objectType === 'logical'
      ? '逻辑仓禁用不阻断已有业务'
      : '实体仓禁用只阻止新增逻辑仓，已有逻辑仓和已有业务不受影响';
    const message = dialog.objectType === 'logical' ? '逻辑仓已禁用，新业务不能再选择' : '实体仓已禁用，不影响已有逻辑仓';
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认禁用当前记录？"
        description={description}
        confirmLabel="确认禁用"
        confirmVariant="danger"
        onConfirm={() => finish(message, 'success', { action: 'disable', row: targetRow, nextRow: applyDisable(targetRow) })}
      />
    );
  }

  if (type === 'delete') {
    const blockReason = dialog.objectType === 'logical'
      ? getDeleteBlockReasonLogical(targetRow)
      : getDeleteBlockReasonPhysical(targetRow, logicalRows);
    if (blockReason) {
      return (
        <SimpleDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="无法删除"
          description={blockReason}
          footer={<Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>}
        />
      );
    }
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认删除当前记录？"
        description="删除后不可恢复，未被业务引用且实体仓下无逻辑仓才能删除"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => finish(dialog.objectType === 'logical' ? '逻辑仓已删除' : '实体仓已删除', 'success', { action: 'delete', row: targetRow })}
      />
    );
  }

  if (type === 'enable') {
    // 启用为直接执行、无二次确认（仓库 Demo PRD §2.3），此分支仅兜底。
    return null;
  }

  if (type === 'batch-submit' || type === 'batch-approve' || type === 'batch-reject') {
    const rows = dialog.rows || [];
    const count = rows.length;
    const config = {
      'batch-submit': { title: '确认批量提交所选记录？', description: `共 ${count} 条，提交后进入待审核状态，由资料审核人处理`, label: '确认提交', message: `已提交 ${count} 条，等待审核` },
      'batch-approve': { title: '确认批量审核通过所选记录？', description: `共 ${count} 条，仅审核通过且使用状态为启用时可供新增引用`, label: '确认通过', message: `已审核通过 ${count} 条` },
      'batch-reject': { title: '确认批量驳回所选记录？', description: `共 ${count} 条，驳回后可以修改资料并重新提交`, label: '确认驳回', message: `已驳回 ${count} 条` },
    }[type];
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={config.title}
        description={config.description}
        confirmLabel={config.label}
        confirmVariant={type === 'batch-reject' ? 'danger' : 'primary'}
        onConfirm={() => finish(config.message, 'success', { action: type, rows, nextRows: applyBatchAudit(rows, type) })}
      />
    );
  }

  if (type === 'batch-delete') {
    const rows = dialog.rows || [];
    const blocked = getBatchDeleteBlockedRows(rows, dialog.objectType, logicalRows);
    if (blocked.length) {
      const names = blocked.slice(0, 3).map((item) => item.code).join('、');
      const reason = dialog.objectType === 'logical' ? getDeleteBlockReasonLogical(blocked[0]) : getDeleteBlockReasonPhysical(blocked[0], logicalRows);
      return (
        <SimpleDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="无法批量删除"
          description={`所选记录中有 ${blocked.length} 条不能删除（${names}${blocked.length > 3 ? ' 等' : ''}）。${reason || ''}`}
          footer={<Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>}
        />
      );
    }
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认批量删除所选记录？"
        description={`共 ${rows.length} 条，删除后不可恢复`}
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => finish(`已删除 ${rows.length} 条记录`, 'success', { action: 'batch-delete', rows })}
      />
    );
  }

  if (type === 'blocked-edit') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="暂不可编辑"
        description={`当前审核状态为「${physicalAuditLabels[targetRow.auditStatus]}」，须先反审核回到草稿后再编辑`}
        footer={<Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>}
      />
    );
  }

  if (type === 'blocked-add-logical') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="暂不可新增逻辑仓"
        description="实体仓审核通过并启用后才能新增逻辑仓"
        footer={<Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>}
      />
    );
  }

  if (type === 'blocked-edit-logical' && logicalRow && !canEditLogical(logicalRow)) {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="暂不可编辑"
        description={`当前审核状态为「${physicalAuditLabels[logicalRow.auditStatus]}」，须先反审核回到草稿后再编辑`}
        footer={<Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>}
      />
    );
  }

  return null;
}
