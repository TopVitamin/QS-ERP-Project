import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog, InfoDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { DatePicker } from '../ui/date-picker.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { formatFormDate, parseFormDate } from '../../lib/formDate.js';
import {
  applyAdjustReturnDeadline,
  applyApproveReturn,
  applyCancelReturn,
  applyCloseReturn,
  applySubmitReturn,
  applyWithdrawReturn,
  canAdjustReturnDeadline,
  canApproveReturn,
  canCancelApprovedReturn,
  canCancelPendingReturn,
  canCloseReturn,
  canDeleteDraftReturn,
  canPushReturnNotice,
  canSubmitReturn,
  canWithdrawReturn,
  createMockReturnNotice,
  deleteReturnById,
  getReturnCancelBlockReason,
  hasReturnDownstreamRefs,
  loadReturnById,
} from '../../lib/purchaseReturnLogic.js';
import { simulateReturnAutoPush } from '../../lib/purchaseReturnNoticeLogic.js';

/** Demo Mock 开关：审核通过后可一键生成演示用采退发货通知单（弹窗PRD §4）。 */
const MOCK_ENABLED = true;

const STATE_CHANGED_MESSAGE = '操作失败，单据状态已变更，请刷新后重试';

/**
 * 采购退货单模块弹窗：提交、审核、撤回、调整退货截止日期、关闭、取消、删除草稿、
 * 来源变更确认与审核后 Mock 引导（弹窗与Mock PRD §2、§3.1～§3.7、§4）。
 */
export function PurchaseReturnActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [returnComment, setReturnComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [returnDeadline, setReturnDeadline] = useState('');

  useEffect(() => {
    if (!dialog) return;
    setReturnComment('');
    setCancelReason('');
    setCloseReason('');
    setReturnDeadline(String(dialog.row?.returnDeadline || '').slice(0, 10));
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  function latestRow() {
    return loadReturnById(row?.id) || row;
  }

  function blockStateChanged() {
    onNotify?.(STATE_CHANGED_MESSAGE, 'warning');
    onClose?.();
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交采购退货单？"
        description="提交后进入待审核状态，价格、税率不可再修改；审核通过后占用可用库存与原入库可退额度，审核前仍可撤回修改。"
        confirmLabel="确认提交"
        onConfirm={() => {
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          const latest = latestRow();
          if (!canSubmitReturn(latest)) {
            blockStateChanged();
            return;
          }
          finish('采购退货单已提交', 'success', applySubmitReturn(latest));
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
        description="审核后占用出库仓可用库存与原入库可退额度，数量、价格、仓库不可再修改，仅可调整退货截止日期。"
        confirmLabel="确认审核"
        onConfirm={() => {
          const latest = latestRow();
          if (!canApproveReturn(latest)) {
            blockStateChanged();
            return;
          }
          let nextRow;
          try {
            nextRow = applyApproveReturn(latest);
          } catch (error) {
            onNotify?.(error.message || '审核失败，请稍后重试', 'warning');
            onClose?.();
            return;
          }
          if (MOCK_ENABLED) {
            onComplete?.({ message: '采购退货单已审核', type: 'success', row: nextRow, followUp: 'mock-notice' });
            onClose?.();
            return;
          }
          finish('采购退货单已审核', 'success', nextRow);
        }}
      />
    );
  }

  if (type === 'mock-notice') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="采购退货单已审核"
        description="正式流程需按退货安排手工创建采退发货通知。Demo 可一键生成本次演示用通知单，便于查看主链。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={() => finish('采购退货单已审核', 'success', row)}>稍后手工创建</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  const { returnRow, notice } = createMockReturnNotice(row);
                  simulateReturnAutoPush(notice.id);
                  finish('已生成演示用采退发货通知单（Mock）', 'success', returnRow);
                } catch (error) {
                  onNotify?.(error.message || '生成演示通知单失败', 'warning');
                  onClose?.();
                }
              }}
            >
              生成演示通知单（Mock）
            </Button>
          </>
        )}
      />
    );
  }

  if (type === 'withdraw') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="撤回采购退货单"
        description="请填写撤回意见"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!returnComment.trim()}
              onClick={() => {
                const latest = latestRow();
                if (!canWithdrawReturn(latest)) {
                  blockStateChanged();
                  return;
                }
                finish('采购退货单已撤回，请修改后重新提交', 'success', applyWithdrawReturn(latest, returnComment.trim()));
              }}
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

  if (type === 'adjustDeadline') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="调整退货截止日期"
        description="仅修改退货截止日期，数量、仓库与价格不变。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!returnDeadline}
              onClick={() => {
                const latest = latestRow();
                if (!canAdjustReturnDeadline(latest)) {
                  blockStateChanged();
                  return;
                }
                finish('退货截止日期已更新', 'success', applyAdjustReturnDeadline(latest, returnDeadline));
              }}
            >
              确认
            </Button>
          </>
        )}
      >
        <div className="mt-3 space-y-1.5">
          <label className="text-[12px] text-erp-text" htmlFor="purchase-return-deadline">新退货截止日期</label>
          <DatePicker
            id="purchase-return-deadline"
            value={parseFormDate(returnDeadline)}
            onChange={(nextDate) => setReturnDeadline(formatFormDate(nextDate))}
            ariaLabel="新退货截止日期"
            placeholder="请选择日期"
          />
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'close') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="关闭采购退货单"
        description="关闭后不可撤销，不能再新增采退发货通知；已有通知继续执行。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!closeReason.trim()}
              onClick={() => {
                const latest = latestRow();
                if (!canCloseReturn(latest)) {
                  blockStateChanged();
                  return;
                }
                finish('采购退货单已关闭', 'success', applyCloseReturn(latest, closeReason.trim()));
              }}
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
    const blockReason = getReturnCancelBlockReason(row);
    if (blockReason) {
      return (
        <InfoDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="无法取消采购退货单"
          description={blockReason}
          onConfirm={onClose}
        />
      );
    }

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消采购退货单"
        description="取消后整单不再执行，不可撤销；已有实际出库时不能取消整单。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => {
                const latest = latestRow();
                if (!canCancelPendingReturn(latest) && !canCancelApprovedReturn(latest)) {
                  blockStateChanged();
                  return;
                }
                const reason = getReturnCancelBlockReason(latest);
                if (reason) {
                  onNotify?.(reason, 'warning');
                  onClose?.();
                  return;
                }
                finish('采购退货单已取消', 'success', applyCancelReturn(latest, cancelReason.trim()));
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
        title="删除采购退货单草稿？"
        description="删除后不可恢复，确定删除该草稿？"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          const latest = latestRow();
          if (!canDeleteDraftReturn(latest)) {
            blockStateChanged();
            return;
          }
          if (hasReturnDownstreamRefs(latest.id)) {
            onNotify?.('该草稿已被下游引用，不能删除', 'warning');
            onClose?.();
            return;
          }
          deleteReturnById(latest.id);
          onComplete?.({ message: '采购退货单草稿已删除', type: 'success', deleted: true, id: latest.id });
          onClose?.();
        }}
      />
    );
  }

  if (type === 'changeSource') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="更换来源采购入库单？"
        description="更换后将按新来源重新带出供应商、币别与商品明细，原带出内容全部清空。"
        confirmLabel="确认更换"
        onConfirm={() => {
          dialog.onConfirm?.();
          onClose?.();
        }}
      />
    );
  }

  if (type === 'clearSource') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="清空来源采购入库单？"
        description="清空后将断开来源入库单行关联，并清空带出的供应商与币别；已录商品与数量保留，按无来源口径校验。"
        confirmLabel="确认清空"
        onConfirm={() => {
          dialog.onConfirm?.();
          onClose?.();
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

/** 详情页页头业务按钮：返回列表之后按状态互斥展示（主PRD §6.4、详情页 Demo PRD §2.2）。 */
export function PurchaseReturnDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];

  if (canSubmitReturn(row)) {
    actions.push({ id: 'submit', label: '提交', variant: 'primary' });
  }
  if (canDeleteDraftReturn(row)) {
    actions.push({ id: 'delete', label: '删除', variant: 'outline' });
  }

  if (canApproveReturn(row)) {
    actions.push({ id: 'approve', label: '审核', variant: 'primary' });
  }
  if (canWithdrawReturn(row)) {
    actions.push({ id: 'withdraw', label: '撤回', variant: 'outline' });
  }
  if (canCancelPendingReturn(row)) {
    actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  }

  if (row.auditStatus === 'approved' && row.businessStatus === 'normal') {
    if (canPushReturnNotice(row)) {
      actions.push({ id: 'notice', label: '下推通知单', variant: 'outline' });
    }
    if (canCancelApprovedReturn(row)) {
      actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
    }
    if (canCloseReturn(row)) {
      actions.push({ id: 'close', label: '关闭', variant: 'outline' });
    }
    if (canAdjustReturnDeadline(row)) {
      actions.push({ id: 'adjustDeadline', label: '调整截止时间', variant: 'outline' });
    }
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
