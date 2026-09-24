import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { REMARK_500_MAX } from '../../data/inventoryStockData.js';
import {
  applyCancelOutNotice,
  applyMockShipOutNotice,
  applyRetryPushOutNotice,
  canCancelNotice,
  canMockShip,
  canRetryPush,
  loadTransferOutNoticeById,
  sumTransferOutNoticeRemainingQty,
} from '../../lib/transferOutNoticeLogic.js';

/**
 * 调出通知单模块弹窗：重试推送、取消（待推送／推送失败、待发货）、模拟仓库回传。
 * 标题、正文与失败文案见《调出通知单前端Demo版PRD_弹窗与Mock》§2、§3。
 */
export function TransferOutNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [reason, setReason] = useState('');
  const [actualQty, setActualQty] = useState('');

  useEffect(() => {
    if (!dialog) return;
    setReason('');
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
        title="重试推送调出仓"
        description="将对本通知单重新发送调出仓，不重新审核、不重复预占。发送结果不确定时请先核实仓库是否已接收。"
        confirmLabel="确认重试"
        onConfirm={() => finish('已重新推送调出仓', 'success', applyRetryPushOutNotice(row))}
      />
    );
  }

  if (type === 'cancel') {
    const isPendingShip = row.status === 'pending_ship';
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消调出通知单"
        description={isPendingShip
          ? '调出仓已接收本指令，取消需等待仓库回执，不能单方面认定；取消中仍会处理到达的实际调出结果。'
          : '取消后本单不再执行，不可撤销；未执行部分的预占在取消成功后释放。推送失败时请先确认仓库未接收。'}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!reason.trim()}
              onClick={() => {
                const next = applyCancelOutNotice(row, reason.trim());
                finish(
                  isPendingShip ? '已向仓库发起取消，等待仓库回执' : '通知单已取消，未执行预占已释放',
                  'success',
                  next,
                );
              }}
            >
              确认取消
            </Button>
          </>
        )}
      >
        <div className="mt-3">
          <FormField label="取消原因 *">
            <Textarea
              rows={3}
              maxLength={REMARK_500_MAX}
              value={reason}
              placeholder="请输入取消原因"
              aria-label="取消原因"
              onChange={(event) => setReason(event.target.value)}
            />
          </FormField>
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'mock-ship') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="模拟仓库回传（Demo）"
        description="按实际调出数量生成演示用调出端直接调拨单与调入通知单；正式流程以仓库回传为准。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  const outcome = applyMockShipOutNotice(row, Number(actualQty));
                  if (outcome.status === 'zero_out') {
                    finish('已按零调出取消整张分步式调拨单，未执行预占已释放', 'success', outcome.row);
                    return;
                  }
                  const remaining = sumTransferOutNoticeRemainingQty(outcome.row.lines);
                  finish(
                    remaining > 0
                      ? `仓库回传已确认，未发 ${remaining} 件已释放预占，并生成调出端直接调拨单与调入通知单`
                      : '仓库回传已确认，已生成调出端直接调拨单与调入通知单',
                    'success',
                    loadTransferOutNoticeById(row.id) || outcome.row,
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
          <FormField label="实际调出数量 *">
            <Input
              type="number"
              min="0"
              step="1"
              value={actualQty}
              placeholder={`请输入实际调出数量（通知调出数量 ${row.totalQuantity || 0}）`}
              aria-label="实际调出数量"
              onChange={(event) => setActualQty(event.target.value)}
            />
          </FormField>
        </div>
        <p className="mt-3 text-[12px] text-erp-text-muted">
          实出为0时按零调出取消整张分步式调拨单；超过通知数量将整次拒绝。Mock 仅用于演示，不代表正式接口。
        </p>
      </SimpleDialog>
    );
  }

  return null;
}

/**
 * 调出通知单详情页头操作：返回列表之后按状态互斥展示（主PRD §6.4）。
 * 待推送／推送失败／待发货提供取消；推送失败提供重试推送；本期无新增、编辑、提交、审核入口。
 */
export function TransferOutNoticeDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];
  if (canRetryPush(row)) actions.push({ id: 'retry', label: '重试推送', variant: 'outline' });
  if (canCancelNotice(row)) actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  if (canMockShip(row)) actions.push({ id: 'mock-ship', label: '模拟仓库回传(Mock)', variant: 'outline' });

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
