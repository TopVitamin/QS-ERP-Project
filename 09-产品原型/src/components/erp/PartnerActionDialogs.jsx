import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import {
  applyApprove,
  applyBatchAudit,
  applyDisable,
  applyReject,
  applySubmit,
  applyUnapprove,
  auditLabels,
  getBatchDeleteBlockedRows,
  getDeleteBlockReason,
} from '../../lib/partnerMasterLogic.js';

export function PartnerActionDialogs({ dialog, onClose, onComplete, entityName = '记录' }) {
  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, tone = 'success', payload) {
    onComplete?.({ message, type: tone, ...payload });
    onClose?.();
  }

  if (type === 'confirm-leave') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="离开当前页面？"
        description="离开后未保存的内容将丢失"
        confirmLabel="确认离开"
        cancelLabel="继续编辑"
        confirmVariant="danger"
        onConfirm={() => {
          dialog.onConfirmLeave?.();
          onClose?.();
        }}
      />
    );
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`确认提交当前${entityName}？`}
        description="提交后进入待审核状态，由资料审核人处理"
        confirmLabel="确认提交"
        onConfirm={() => finish('已提交审核，等待审核', 'success', { action: 'submit', row, nextRow: applySubmit(row) })}
      />
    );
  }

  if (type === 'approve') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`确认审核通过当前${entityName}？`}
        description="审核通过且使用状态为启用时，业务单据才可引用"
        confirmLabel="确认通过"
        onConfirm={() => finish(`${entityName}已审核通过`, 'success', { action: 'approve', row, nextRow: applyApprove(row) })}
      />
    );
  }

  if (type === 'reject') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`确认驳回当前${entityName}？`}
        description="驳回后可以修改资料并重新提交"
        confirmLabel="确认驳回"
        confirmVariant="danger"
        onConfirm={() => finish(`${entityName}已驳回，可修改后重新提交`, 'success', { action: 'reject', row, nextRow: applyReject(row) })}
      />
    );
  }

  if (type === 'unapprove') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`确认反审核当前${entityName}？`}
        description="反审核后回到草稿；修改后须重新提交审核，重新审核通过前新单不能引用"
        confirmLabel="确认反审核"
        onConfirm={() => finish('已反审核，可修改后重新提交审核', 'success', { action: 'unapprove', row, nextRow: applyUnapprove(row) })}
      />
    );
  }

  if (type === 'disable') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`确认禁用当前${entityName}？`}
        description="禁用后新业务不能再选择，已有单据不受影响"
        confirmLabel="确认禁用"
        confirmVariant="danger"
        onConfirm={() => finish(`${entityName}已禁用，新业务不能再选择`, 'success', { action: 'disable', row, nextRow: applyDisable(row) })}
      />
    );
  }

  if (type === 'enable') {
    // 启用为直接执行、无二次确认（供应商/客户 Demo PRD 1.3），此分支仅兜底。
    return null;
  }

  if (type === 'delete') {
    const blockReason = getDeleteBlockReason(row);
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
        title={`确认删除当前${entityName}？`}
        description="删除后不可恢复，只有未被业务引用的记录可以删除"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => finish(`${entityName}已删除`, 'success', { action: 'delete', row })}
      />
    );
  }

  if (type === 'batch-submit' || type === 'batch-approve' || type === 'batch-reject') {
    const rows = dialog.rows || [];
    const count = rows.length;
    const config = {
      'batch-submit': { title: `确认批量提交所选${entityName}？`, description: `共 ${count} 条，提交后进入待审核状态，由资料审核人处理`, label: '确认提交', message: `已提交 ${count} 条，等待审核` },
      'batch-approve': { title: '确认批量审核通过所选记录？', description: `共 ${count} 条，审核通过且使用状态为启用时，业务单据才可引用`, label: '确认通过', message: `已审核通过 ${count} 条` },
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
    const blocked = getBatchDeleteBlockedRows(rows);
    if (blocked.length) {
      const names = blocked.slice(0, 3).map((item) => item.code).join('、');
      return (
        <SimpleDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="无法批量删除"
          description={`所选记录中有 ${blocked.length} 条不能删除（${names}${blocked.length > 3 ? ' 等' : ''}）。${getDeleteBlockReason(blocked[0])}`}
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
        description={`当前审核状态为「${auditLabels[row.auditStatus]}」，须先反审核回到草稿后再编辑`}
        footer={<Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>}
      />
    );
  }

  return null;
}
