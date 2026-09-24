import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import {
  applyMockReceiveInNotice,
  applyRetryPushInNotice,
  canMockReceive,
  canRetryPush,
  loadTransferInNoticeById,
  sumTransferInNoticeShortageQty,
} from '../../lib/transferInNoticeLogic.js';

/**
 * 调入通知单模块弹窗：重试推送、模拟接收仓回传。
 * 本期不提供取消弹窗（货已实际发出，取消会让在途失去归属，主PRD §6.4、Q02）。
 * 标题、正文与失败文案见《调入通知单前端Demo版PRD_弹窗与Mock》§2、§4。
 */
export function TransferInNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [actualQty, setActualQty] = useState('');

  useEffect(() => {
    if (!dialog) return;
    setActualQty('');
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  if (type === 'retry') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="重试推送接收仓"
        description="将对本通知单重新发送接收仓，不重新生成、不重复回写。发送结果不确定时请先核实仓库是否已接收。"
        confirmLabel="确认重试"
        onConfirm={() => finish('已重新推送接收仓', 'success', applyRetryPushInNotice(row))}
      />
    );
  }

  if (type === 'mock-receive') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="模拟接收仓回传（Demo）"
        description="按实际调入数量生成演示用调入端直接调拨单并触发主单完结；正式流程以仓库回传为准。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  const outcome = applyMockReceiveInNotice(row, Number(actualQty));
                  if (outcome.status === 'zero_rejected') {
                    onNotify?.('实际调入必须大于0，回传已被拒绝，请改为大于0后重新回传', 'warning');
                    onComplete?.({ row: outcome.row, keepOpen: true });
                    return;
                  }
                  const shortage = sumTransferInNoticeShortageQty(outcome.row.lines);
                  finish(
                    shortage > 0
                      ? `仓库回传已确认，少收 ${shortage} 件留在途，主单已自动完结`
                      : '仓库回传已确认，主单已自动完结',
                    'success',
                    loadTransferInNoticeById(row.id) || outcome.row,
                  );
                } catch (error) {
                  onNotify?.(error.message || '回传失败，请稍后重试', 'warning');
                }
              }}
            >
              确认回传
            </Button>
          </>
        )}
      >
        <div className="mt-3">
          <FormField label="实际调入数量 *">
            <Input
              type="number"
              min="0"
              step="1"
              value={actualQty}
              placeholder={`请输入实际调入数量（通知调入数量 ${row.totalQuantity || 0}）`}
              aria-label="实际调入数量"
              onChange={(event) => setActualQty(event.target.value)}
            />
          </FormField>
        </div>
        <p className="mt-3 text-[12px] text-erp-text-muted">
          实收为0将整次拒绝并保持等待；少收差额留在途，不自动抹平。Mock 仅用于演示，不代表正式接口。
        </p>
      </SimpleDialog>
    );
  }

  return null;
}

/**
 * 调入通知单详情页头操作：返回列表之后按状态互斥展示（主PRD §6.4）。
 * 仅推送失败提供重试推送；本期不提供取消；待收货提供回传 Mock。
 */
export function TransferInNoticeDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];
  if (canRetryPush(row)) actions.push({ id: 'retry', label: '重试推送', variant: 'outline' });
  if (canMockReceive(row)) actions.push({ id: 'mock-receive', label: '模拟接收仓回传(Mock)', variant: 'outline' });

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
