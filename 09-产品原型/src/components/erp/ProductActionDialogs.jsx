import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Button } from '../ui/button.jsx';
import {
  applyDisable,
  getDeleteBlockReason,
} from '../../lib/productLogic.js';

export function ProductActionDialogs({ dialog, onClose, onComplete }) {
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
        confirmVariant="danger"
        onConfirm={() => {
          dialog.onConfirmLeave?.();
          onClose?.();
        }}
      />
    );
  }

  if (type === 'disable') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认禁用商品？"
        description="禁用后新业务不能再选择该商品，已有单据和价目表不受影响"
        confirmLabel="确认禁用"
        confirmVariant="danger"
        onConfirm={() => finish('商品已禁用，新业务不能再选择', 'success', { action: 'disable', row, nextRow: applyDisable(row) })}
      />
    );
  }

  if (type === 'delete') {
    const blockReason = getDeleteBlockReason(row);
    if (blockReason) {
      return (
        <SimpleDialog open onOpenChange={(open) => { if (!open) onClose?.(); }} title="无法删除商品">
          <p className="text-[12px] text-erp-text-muted">{blockReason}</p>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="compact" onClick={() => onClose?.()}>知道了</Button>
          </div>
        </SimpleDialog>
      );
    }
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认删除商品？"
        description="删除后无法恢复。只有未被业务单据或价目表引用的商品可以删除"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => finish('商品已删除', 'success', { action: 'delete', row })}
      />
    );
  }

  return null;
}
