import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { applyRetryKingdeePush } from '../../lib/inboundLogic.js';

export function PurchaseInboundActionDialogs({ dialog, onClose, onComplete }) {
  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  if (type === 'retry-kingdee') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="重推金蝶"
        description="将重新推送本入库单至金蝶，请确认失败原因已处理。重推不会重复增加库存。"
        confirmLabel="确认重推"
        onConfirm={() => finish('已重新推送金蝶', 'success', applyRetryKingdeePush(row))}
      />
    );
  }

  return null;
}

export function PurchaseInboundDetailHeaderActions({ row, onAction }) {
  if (!row || row.kingdeePushStatus !== 'push_failed') return null;

  return (
    <Button variant="outline" size="compact" onClick={() => onAction('retry-kingdee', row)}>
      重推金蝶
    </Button>
  );
}
