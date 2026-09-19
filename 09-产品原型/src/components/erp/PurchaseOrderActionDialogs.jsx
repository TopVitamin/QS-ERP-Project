import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog, InfoDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import {
  applyAdjustDelivery,
  applyApprove,
  applyCancel,
  applyClose,
  applyReject,
  applySubmit,
  canCancelApprovedOrder,
  canCancelPendingOrder,
  canAdjustDeliveryDate,
  canCloseOrder,
  canDeleteDraftOrder,
  canPushNotice,
  deleteOrderById,
  getCancelBlockReason,
} from '../../lib/purchaseOrderLogic.js';
import { cancelNoticesWithOrder, createMockReceiptNotice } from '../../lib/receiptNoticeLogic.js';

const MOCK_ENABLED = true;

export function PurchaseOrderActionDialogs({ dialog, onClose, onComplete }) {
  const [returnComment, setReturnComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');

  useEffect(() => {
    if (!dialog) return;
    setReturnComment('');
    setCancelReason('');
    setCloseReason('');
    setDeliveryDate(dialog.row?.deliveryDate || '');
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
        title="确认提交采购订单？"
        description="提交后进入待审核状态，数量和价格将在审核后锁定，审核前仍可撤回修改。"
        confirmLabel="确认提交"
        onConfirm={() => {
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          finish('采购订单已提交', 'success', applySubmit(row));
        }}
      />
    );
  }

  if (type === 'approve') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核？"
        description="审核后订单可发给供应商，数量和价格不可再修改。"
        confirmLabel="确认审核"
        onConfirm={() => {
          const nextRow = applyApprove(row);
          if (MOCK_ENABLED) {
            onComplete?.({ message: '采购订单已审核', type: 'success', row: nextRow, followUp: 'mock-notice' });
            onClose?.();
            return;
          }
          finish('采购订单已审核', 'success', nextRow);
        }}
      />
    );
  }

  if (type === 'mock-notice') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="采购订单已审核"
        description="正式流程需按供应商发货反馈手工创建收货通知。Demo 可一键生成本次演示用通知单，便于查看主链。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={() => finish('采购订单已审核', 'success', row)}>稍后手工创建</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const nextRow = createMockReceiptNotice(row);
                finish('已生成演示用收货通知单（Mock）', 'success', nextRow);
              }}
            >
              生成演示通知单（Mock）
            </Button>
          </>
        )}
      />
    );
  }

  if (type === 'reject') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="撤回采购订单"
        description="请填写撤回意见"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!returnComment.trim()}
              onClick={() => finish('采购订单已撤回，请修改后重新提交', 'success', applyReject(row, returnComment.trim()))}
            >
              确认撤回
            </Button>
          </>
        )}
      >
        <Textarea value={returnComment} onChange={(event) => setReturnComment(event.target.value)} placeholder="请输入撤回意见" rows={4} className="mt-3" />
      </SimpleDialog>
    );
  }

  if (type === 'adjustDate') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="调整承诺交期"
        description="仅修改承诺交期，数量和价格不变。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!deliveryDate}
              onClick={() => finish('承诺交期已更新', 'success', applyAdjustDelivery(row, deliveryDate))}
            >
              确认
            </Button>
          </>
        )}
      >
        <div className="mt-3 space-y-1.5">
          <label className="text-[12px] text-erp-text">新承诺交期</label>
          <Input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'close') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="关闭采购订单"
        description="关闭后不可撤销，不能再新增收货通知；已有通知继续执行。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!closeReason.trim()}
              onClick={() => finish('采购订单已关闭', 'success', applyClose(row, closeReason.trim()))}
            >
              确认关闭
            </Button>
          </>
        )}
      >
        <Textarea value={closeReason} onChange={(event) => setCloseReason(event.target.value)} placeholder="请输入关闭原因" rows={3} className="mt-3" />
      </SimpleDialog>
    );
  }

  if (type === 'cancel') {
    const blockReason = getCancelBlockReason(row);
    if (blockReason) {
      return (
        <InfoDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="无法取消采购订单"
          description={blockReason}
          onConfirm={onClose}
        />
      );
    }

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消采购订单"
        description="取消后整单不再执行，不可撤销。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => {
                const reason = cancelReason.trim();
                cancelNoticesWithOrder(row.id, reason);
                finish('采购订单已取消', 'success', applyCancel(row, reason));
              }}
            >
              确认取消
            </Button>
          </>
        )}
      >
        <Textarea value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="请输入取消原因" rows={3} className="mt-3" />
      </SimpleDialog>
    );
  }

  if (type === 'delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认删除此采购订单？"
        description="删除后记录将从列表移除。"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          deleteOrderById(row.id);
          finish('采购订单已删除', 'success', null);
          onComplete?.({ message: '采购订单已删除', type: 'success', deleted: true, id: row.id });
        }}
      />
    );
  }

  if (type === 'zeroPrice') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认使用零价？"
        description={dialog.description || '存在含税单价为 0 的明细行，请确认业务约定。'}
        confirmLabel="确认继续"
        onConfirm={() => onComplete?.({ type: 'zeroPriceConfirmed', onConfirm: dialog.onConfirm })}
      />
    );
  }

  return null;
}

export function PurchaseOrderDetailHeaderActions({ row, onAction }) {
  if (!row) return null;
  if (row.businessStatus === 'cancelled' || row.businessStatus === 'closed') return null;

  const actions = [];

  if (canDeleteDraftOrder(row)) {
    actions.push({ id: 'submit', label: '提交', variant: 'primary' });
    actions.push({ id: 'delete', label: '删除', variant: 'outline' });
  }

  if (canCancelPendingOrder(row)) {
    actions.push({ id: 'approve', label: '审核', variant: 'primary' });
    actions.push({ id: 'reject', label: '撤回', variant: 'outline' });
    actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  }

  if (row.auditStatus === 'approved' && row.businessStatus === 'normal') {
    if (canPushNotice(row)) {
      actions.push({ id: 'notice', label: '下推通知单', variant: 'outline' });
    }
    if (canCancelApprovedOrder(row)) {
      actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
    }
    if (canCloseOrder(row)) {
      actions.push({ id: 'close', label: '关闭', variant: 'outline' });
    }
    if (canAdjustDeliveryDate(row)) {
      actions.push({ id: 'adjustDate', label: '调整交期', variant: 'outline' });
    }
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
