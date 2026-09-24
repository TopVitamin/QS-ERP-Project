import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { REMARK_500_MAX } from '../../data/inventoryStockData.js';
import { loadTransferInNoticesByOrderId } from '../../lib/transferInNoticeLogic.js';
import {
  approveTransferOrderWithNotice,
  applyMockShipOutNotice,
  loadTransferOutNoticesByOrderId,
  sumTransferOutNoticeRemainingQty,
} from '../../lib/transferOutNoticeLogic.js';
import { applyMockReceiveInNotice, sumTransferInNoticeShortageQty } from '../../lib/transferInNoticeLogic.js';
import {
  applyCancelTransferOrder,
  applyDeleteTransferOrder,
  applySubmitTransferOrder,
  applyWithdrawTransferOrder,
  canApproveTransferOrder,
  canCancelTransferOrder,
  canDeleteTransferOrder,
  canMockOutboundTransferOrder,
  canSubmitTransferOrder,
  canWithdrawTransferOrder,
  loadTransferOrderById,
} from '../../lib/transferOrderLogic.js';

function resolveOutNotice(row) {
  if (!row) return null;
  return loadTransferOutNoticesByOrderId(row.id, row.orderNo)[0] || null;
}

function resolveInNotice(row) {
  if (!row) return null;
  return loadTransferInNoticesByOrderId(row.id, row.orderNo)[0] || null;
}

/**
 * 分步式调拨单模块弹窗：提交、撤回、取消、删除草稿、审核、两端回传 Mock。
 * 标题、正文与失败文案见《分步式调拨单前端Demo版PRD_弹窗与Mock》§2、§3、§4。
 */
export function TransferOrderActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [comment, setComment] = useState('');
  const [reason, setReason] = useState('');
  const [actualQty, setActualQty] = useState('');

  useEffect(() => {
    if (!dialog) return;
    setComment('');
    setReason('');
    setActualQty('');
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交分步式调拨单？"
        description="提交后进入待审核状态，调出仓、接收仓、商品与计划调拨数量不可再修改；审核通过时按计划数量预占调出仓可用库存，可用不足不能审核；审核前仍可撤回修改。"
        confirmLabel="确认提交"
        onConfirm={() => {
          // 新增/编辑页先保存再提交：由页面传入 onConfirm，避免用未落库的表单直接改状态
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          finish('已提交，等待审核', 'success', applySubmitTransferOrder(row));
        }}
      />
    );
  }

  if (type === 'withdraw') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="撤回分步式调拨单"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!comment.trim()}
              onClick={() => finish('已撤回，单据回到草稿', 'success', applyWithdrawTransferOrder(row, comment.trim()))}
            >
              确认撤回
            </Button>
          </>
        )}
      >
        <div className="mt-3">
          <FormField label="撤回意见 *">
            <Textarea
              rows={3}
              maxLength={REMARK_500_MAX}
              value={comment}
              placeholder="请输入撤回意见"
              aria-label="撤回意见"
              onChange={(event) => setComment(event.target.value)}
            />
          </FormField>
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'cancel') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消分步式调拨单"
        description="取消后本单不再执行，不可撤销；本次取消同时终止审核流程。审核通过后不提供主单直接取消，调出仓零调出由仓库回传按零出取消整单。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!reason.trim()}
              onClick={() => finish('单据已取消', 'success', applyCancelTransferOrder(row, reason.trim()))}
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

  if (type === 'delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="删除分步式调拨单草稿"
        description="删除后不可恢复，确定删除该草稿？"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          applyDeleteTransferOrder(row);
          finish('草稿已删除', 'success', null);
        }}
      />
    );
  }

  if (type === 'approve') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核分步式调拨单？"
        description="审核通过后按计划调拨数量预占调出仓可用库存，并由系统自动生成调出通知单、推送调出仓。审核后调出仓、接收仓、商品与数量不可修改。"
        confirmLabel="确认审核"
        onConfirm={() => {
          try {
            const result = approveTransferOrderWithNotice(row);
            finish('审核通过，已预占调出仓库存并推送调出仓', 'success', result.order);
          } catch (error) {
            onNotify?.(error.message || '审核失败，请稍后重试', 'warning');
          }
        }}
      />
    );
  }

  if (type === 'mock-out-ship') {
    const notice = resolveOutNotice(row);
    const plannedTotal = notice ? notice.totalQuantity : 0;
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="模拟调出仓回传（Demo）"
        description="按实际调出数量生成演示用调出端直接调拨单与调入通知单；正式流程以仓库回传为准。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                if (!notice) {
                  onNotify?.('调出通知单不存在，无法回传', 'warning');
                  return;
                }
                try {
                  const outcome = applyMockShipOutNotice(notice, Number(actualQty));
                  if (outcome.status === 'zero_out') {
                    finish('已按零调出取消整张分步式调拨单，未执行预占已释放', 'success', outcome.order);
                    return;
                  }
                  const remaining = sumTransferOutNoticeRemainingQty(outcome.row.lines);
                  finish(
                    remaining > 0
                      ? `仓库回传已确认，未发 ${remaining} 件已释放预占，并生成调出端直接调拨单与调入通知单`
                      : '仓库回传已确认，已生成调出端直接调拨单与调入通知单',
                    'success',
                    loadTransferOrderById(row.id) || row,
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
        <div className="mt-3 grid grid-cols-1 gap-3">
          <FormField label="回传环节 *">
            <Input value="调出仓回传" disabled aria-label="回传环节" />
          </FormField>
          <FormField label="实际调出数量 *">
            <Input
              type="number"
              min="0"
              step="1"
              value={actualQty}
              placeholder={`请输入实际调出数量（通知调出数量 ${plannedTotal}）`}
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

  if (type === 'mock-in-receive') {
    const notice = resolveInNotice(row);
    const plannedTotal = notice ? notice.totalQuantity : 0;
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
                if (!notice) {
                  onNotify?.('调入通知单不存在，无法回传', 'warning');
                  return;
                }
                try {
                  const outcome = applyMockReceiveInNotice(notice, Number(actualQty));
                  if (outcome.status === 'zero_rejected') {
                    onNotify?.('实际调入必须大于0，回传已被拒绝，请改为大于0后重新回传', 'warning');
                    onComplete?.({ keepOpen: true });
                    return;
                  }
                  const shortage = sumTransferInNoticeShortageQty(outcome.row.lines);
                  finish(
                    shortage > 0
                      ? `仓库回传已确认，少收 ${shortage} 件留在途，主单已自动完结`
                      : '仓库回传已确认，主单已自动完结',
                    'success',
                    outcome.order,
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
        <div className="mt-3 grid grid-cols-1 gap-3">
          <FormField label="回传环节 *">
            <Input value="接收仓回传" disabled aria-label="回传环节" />
          </FormField>
          <FormField label="实际调入数量 *">
            <Input
              type="number"
              min="0"
              step="1"
              value={actualQty}
              placeholder={`请输入实际调入数量（通知调入数量 ${plannedTotal}）`}
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

  // 主单不推送仓库与财务ERP（R16），推送失败的重试入口在调出通知单侧，主单不提供该弹窗。
  return null;
}

/**
 * 分步式调拨单详情页头操作：返回列表之后按状态互斥展示（主PRD §6.4、骨架页头按钮顺序）。
 * 已审核+正常不提供主单取消；两端回传 Mock 仅在对应通知单可执行时展示。
 */
export function TransferOrderDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];
  if (canSubmitTransferOrder(row)) actions.push({ id: 'submit', label: '提交', variant: 'outline' });
  if (canDeleteTransferOrder(row)) actions.push({ id: 'delete', label: '删除', variant: 'outline' });
  if (canApproveTransferOrder(row)) actions.push({ id: 'approve', label: '审核', variant: 'primary' });
  if (canWithdrawTransferOrder(row)) actions.push({ id: 'withdraw', label: '撤回', variant: 'outline' });
  if (canCancelTransferOrder(row)) actions.push({ id: 'cancel', label: '取消', variant: 'outline' });

  if (canMockOutboundTransferOrder(row)) {
    const outNotice = resolveOutNotice(row);
    const inNotice = resolveInNotice(row);
    if (outNotice?.status === 'pending_ship') {
      actions.push({ id: 'mock-out-ship', label: '模拟调出仓回传(Mock)', variant: 'outline' });
    }
    if (inNotice?.status === 'pending_receive') {
      actions.push({ id: 'mock-in-receive', label: '模拟接收仓回传(Mock)', variant: 'outline' });
    }
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
