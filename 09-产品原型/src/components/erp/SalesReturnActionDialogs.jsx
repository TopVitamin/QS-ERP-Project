import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { DatePicker } from '../ui/date-picker.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { formatFormDate, parseFormDate } from '../../lib/formDate.js';
import { salesReturnNotices } from '../../data/salesReturnNoticeData.js';
import {
  applyAdjustReturnDeadline,
  applyApproveSalesReturn,
  applyCancelSalesReturn,
  applyCloseSalesReturn,
  applySubmitSalesReturn,
  applyWithdrawSalesReturn,
  canAdjustReturnDeadline,
  canApproveSalesReturn,
  canCancelApprovedSalesReturn,
  canCancelPendingSalesReturn,
  canCloseSalesReturn,
  canDeleteDraftSalesReturn,
  canEditSalesReturn,
  canPushReturnNotice,
  canSubmitSalesReturn,
  canWithdrawSalesReturn,
  createMockSalesReturnNotice,
  deleteSalesReturnById,
} from '../../lib/salesReturnLogic.js';

const MOCK_ENABLED = true;

export function SalesReturnActionDialogs({ dialog, onClose, onComplete, onNotify }) {
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

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交销售退货单？"
        description="提交后进入待审核状态，价格和税率将锁定，审核后仅可调整退货截止日期，审核前仍可撤回修改。"
        confirmLabel="确认提交"
        onConfirm={() => {
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          finish('销售退货单已提交', 'success', applySubmitSalesReturn(row));
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
        description="审核后将占用原出库单可退额度（溯源退货），数量和价格不可再修改。本单为收货业务，不校验可用库存。"
        confirmLabel="确认审核"
        onConfirm={() => {
          const result = applyApproveSalesReturn(row);
          if (result.error) {
            finish(result.error, 'warning');
            return;
          }
          if (MOCK_ENABLED) {
            onComplete?.({ message: '销售退货单已审核', type: 'success', row: result.row, followUp: 'mock-notice' });
            onClose?.();
            return;
          }
          finish('销售退货单已审核', 'success', result.row);
        }}
      />
    );
  }

  if (type === 'mock-notice') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="销售退货单已审核"
        description="正式流程需手工创建销退收货通知单并选择收货处理方式。Demo 可一键生成本次演示用通知单，便于查看主链。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={() => finish('销售退货单已审核', 'success', row)}>
              稍后手工创建
            </Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const nextRow = createMockSalesReturnNotice(row);
                finish('已生成演示用销退收货通知单（Mock）', 'success', nextRow);
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
        title="撤回销售退货单"
        description="请填写撤回意见"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!returnComment.trim()}
              onClick={() => finish('销售退货单已撤回，请修改后重新提交', 'success', applyWithdrawSalesReturn(row, returnComment.trim()))}
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
        description="审核后仅可调整截止时间，数量和价格不变。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!returnDeadline}
              onClick={() => finish('退货截止日期已更新', 'success', applyAdjustReturnDeadline(row, returnDeadline))}
            >
              确认
            </Button>
          </>
        )}
      >
        <div className="mt-3 space-y-1.5">
          <label className="text-[12px] text-erp-text" htmlFor="sales-return-deadline">新退货截止日期 *</label>
          <DatePicker
            id="sales-return-deadline"
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
        title="关闭销售退货单"
        description="关闭后不可撤销，不能再新增收货通知；已有通知继续执行。关闭释放未退且无通知继续执行的可退额度，已退部分继续计入累计。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!closeReason.trim()}
              onClick={() => finish('关闭成功，单据已关闭', 'success', applyCloseSalesReturn(row, closeReason.trim()))}
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
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消销售退货单"
        description="取消后整单不再执行，不可撤销。须无实际入库且无待执行通知，已推送通知须仓库确认取消成功。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => finish('取消成功', 'success', applyCancelSalesReturn(row, cancelReason.trim(), salesReturnNotices))}
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
        title="删除销售退货单草稿"
        description="删除后不可恢复，确定删除该草稿？仅草稿+正常且未被下游引用的退货单可删除，已提交、已审核或被引用的单据阻断删除。"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          if (!canDeleteDraftSalesReturn(row, salesReturnNotices)) {
            onNotify?.('该退货单非草稿或已被下游引用，不能删除', 'warning');
            onClose?.();
            return;
          }
          deleteSalesReturnById(row.id);
          onComplete?.({ message: '销售退货单已删除', type: 'success', deleted: true, id: row.id });
          onClose?.();
        }}
      />
    );
  }

  return null;
}

export function SalesReturnDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];

  if (canSubmitSalesReturn(row)) {
    actions.push({ id: 'submit', label: '提交', variant: 'primary' });
  }
  if (canEditSalesReturn(row)) {
    actions.push({ id: 'delete', label: '删除', variant: 'danger' });
  }
  if (canApproveSalesReturn(row)) {
    actions.push({ id: 'approve', label: '审核', variant: 'primary' });
  }
  if (canWithdrawSalesReturn(row)) {
    actions.push({ id: 'withdraw', label: '撤回', variant: 'outline' });
  }
  if (canPushReturnNotice(row)) {
    actions.push({ id: 'notice', label: '下推通知单', variant: 'outline' });
  }
  if (canCancelPendingSalesReturn(row) || canCancelApprovedSalesReturn(row, salesReturnNotices)) {
    actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  }
  if (canCloseSalesReturn(row)) {
    actions.push({ id: 'close', label: '关闭', variant: 'outline' });
  }
  if (canAdjustReturnDeadline(row)) {
    actions.push({ id: 'adjustDeadline', label: '调整截止时间', variant: 'outline' });
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
