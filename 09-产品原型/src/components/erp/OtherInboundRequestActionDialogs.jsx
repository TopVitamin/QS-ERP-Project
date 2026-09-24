import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import {
  applyApproveRequest,
  applyCancelRequest,
  applyMockReceiptRequest,
  applyRetryPushRequest,
  applySubmitRequest,
  applyWarehouseCancelResult,
  applyWithdrawRequest,
  buildStatusMismatchMessage,
  canApplyCancelRequest,
  canApproveRequest,
  canCancelApprovedRequest,
  canCancelPendingRequest,
  canMockReceiptRequest,
  canMockWarehouseCancelRequest,
  canRetryPushRequest,
  canSubmitRequest,
  canWithdrawRequest,
  deleteOtherInboundRequest,
  loadOtherInboundRequestById,
  refreshRequestLines,
} from '../../lib/otherInboundRequestLogic.js';
import { ensureOtherInboundSeed } from '../../lib/otherInboundLogic.js';
import { otherInbounds } from '../../data/otherInboundData.js';

const receiptTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const receiptHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const receiptThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const receiptRowClassName = 'h-8 border-b border-erp-border-table-row';
const receiptTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

/**
 * 其他入库申请单模块弹窗：提交、审核、撤回、取消、重试推送、删除草稿、离开未保存（框架内建）
 * 与 Demo「模拟仓库回传」「模拟仓库回执」。
 * 文案与必填项见《其他入库申请单前端Demo版PRD_弹窗与Mock》§3、§5；可用条件服从主PRD §6.4。
 */
export function OtherInboundRequestActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [withdrawComment, setWithdrawComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [lineReceipts, setLineReceipts] = useState([]);
  const [zeroReceive, setZeroReceive] = useState(false);

  useEffect(() => {
    if (!dialog) return;
    setWithdrawComment('');
    setCancelReason('');
    setZeroReceive(false);
    setLineReceipts(refreshRequestLines(dialog.row?.lines || []).map((line) => String(line.quantity || 0)));
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function latestRow() {
    return loadOtherInboundRequestById(row?.id) || row;
  }

  function blockMismatch(action) {
    onNotify?.(buildStatusMismatchMessage(latestRow(), action), 'warning');
    onClose?.();
  }

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交其他入库申请单？"
        description="提交后进入待审核状态，入库仓、业务类型与数量不可再修改；审核前仍可撤回修改。"
        confirmLabel="确认提交"
        onConfirm={() => {
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          const latest = latestRow();
          if (!canSubmitRequest(latest)) {
            blockMismatch('提交');
            return;
          }
          finish('其他入库申请单已提交', 'success', applySubmitRequest(latest));
        }}
      />
    );
  }

  if (type === 'approve') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核其他入库申请单？"
        description="审核通过后系统自动推送仓库；入库申请不预占、不增加库存，实际入库以仓库回传的结果单为准。"
        confirmLabel="确认审核"
        onConfirm={() => {
          const latest = latestRow();
          if (!canApproveRequest(latest)) {
            blockMismatch('审核');
            return;
          }
          finish('审核通过，正在推送仓库', 'success', applyApproveRequest(latest));
        }}
      />
    );
  }

  if (type === 'withdraw') {
    const commentEmpty = !withdrawComment.trim();
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="撤回其他入库申请单"
        description="撤回后回到草稿，可修改后重新提交；撤回意见会保留。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={commentEmpty}
              onClick={() => {
                if (commentEmpty) {
                  onNotify?.('请输入撤回意见', 'warning');
                  return;
                }
                const latest = latestRow();
                if (!canWithdrawRequest(latest)) {
                  blockMismatch('撤回');
                  return;
                }
                finish('已撤回', 'success', applyWithdrawRequest(latest, withdrawComment.trim()));
              }}
            >
              确认撤回
            </Button>
          </>
        )}
      >
        <Textarea
          value={withdrawComment}
          onChange={(event) => setWithdrawComment(event.target.value)}
          placeholder="请输入撤回意见"
          aria-label="撤回意见"
          rows={3}
          className="mt-3"
        />
      </SimpleDialog>
    );
  }

  if (type === 'cancel' || type === 'apply-cancel') {
    const reasonEmpty = !cancelReason.trim();
    // 待收货只能申请取消（进入取消中），按当前状态兜底判断（R17）。
    const isApplyCancel = type === 'apply-cancel' || row?.status === 'pending_receive';
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消其他入库申请单"
        description="取消后本单不再执行，不可撤销。已推送给仓库的，需等待仓库确认取消或实际结果，不能单方面认定。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={reasonEmpty}
              onClick={() => {
                if (reasonEmpty) {
                  onNotify?.('请输入取消原因', 'warning');
                  return;
                }
                const latest = latestRow();
                const allowed = isApplyCancel
                  ? canApplyCancelRequest(latest)
                  : (canCancelPendingRequest(latest) || canCancelApprovedRequest(latest));
                if (!allowed) {
                  blockMismatch('取消');
                  return;
                }
                const next = applyCancelRequest(latest, cancelReason.trim());
                finish(next.status === 'cancelling' ? '已申请取消，等待仓库确认' : '已取消', 'success', next);
              }}
            >
              确认取消
            </Button>
          </>
        )}
      >
        <Textarea
          value={cancelReason}
          onChange={(event) => setCancelReason(event.target.value)}
          placeholder="请输入取消原因"
          aria-label="取消原因"
          rows={3}
          className="mt-3"
        />
      </SimpleDialog>
    );
  }

  if (type === 'retry') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="重试推送仓库"
        description="将对本申请单重新发送仓库，不重新审核、不重复占库。发送结果不确定时请先核实仓库是否已接收。"
        confirmLabel="确认重试"
        onConfirm={() => {
          const latest = latestRow();
          if (!canRetryPushRequest(latest)) {
            blockMismatch('重试推送');
            return;
          }
          finish('已重新推送，等待仓库接收', 'success', applyRetryPushRequest(latest));
        }}
      />
    );
  }

  if (type === 'delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="删除其他入库申请单草稿"
        description="删除后不可恢复，确定删除该草稿？"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          const latest = latestRow();
          if (latest?.status !== 'draft') {
            blockMismatch('删除');
            return;
          }
          deleteOtherInboundRequest(latest.id);
          onComplete?.({ message: '草稿已删除', type: 'success', deleted: true, id: latest.id });
          onClose?.();
        }}
      />
    );
  }

  if (type === 'mock-receipt') {
    const lines = refreshRequestLines(row.lines || []);
    const totalRequestQty = lines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟仓库回传（Demo）"
        description="按实际入库数量生成演示用其他入库单；正式流程以仓库回传为准。实收数量须为整数、大于 0 且不超过申请数量。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const latest = latestRow();
                if (!canMockReceiptRequest(latest)) {
                  blockMismatch('模拟仓库回传');
                  return;
                }
                try {
                  // Demo：先生成前装载结果单演示数据，避免新单与种子单号冲突、演示数据被覆盖。
                  ensureOtherInboundSeed(otherInbounds);
                  const nextRow = applyMockReceiptRequest(latest, {
                    zeroReceive,
                    lineReceipts: lines.map((line, index) => lineReceipts[index]),
                  });
                  const message = zeroReceive
                    ? '申请单已按零收取消，未生成其他入库单'
                    : `仓库回传已确认，已生成其他入库单 ${nextRow.inboundNo}`;
                  finish(message, 'success', nextRow);
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
        <div className="mt-3 space-y-3">
          <div className="table-scroll overflow-x-auto">
            <table className={receiptTableClassName} style={{ minWidth: '760px' }}>
              <colgroup>
                <col className="w-10" />
                <col className="w-[112px]" />
                <col className="w-[170px]" />
                <col className="w-[64px]" />
                <col className="w-[120px]" />
                <col className="w-[120px]" />
              </colgroup>
              <thead className={receiptHeadClassName}>
                <tr>
                  <th className={receiptThClassName}>行号</th>
                  <th className={receiptThClassName}>商品编码</th>
                  <th className={receiptThClassName}>商品名称</th>
                  <th className={receiptThClassName}>基本单位</th>
                  <th className={cn(receiptThClassName, 'text-right')}>申请入库数量</th>
                  <th className={cn(receiptThClassName, 'text-right')}>实收数量</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id || index} className={receiptRowClassName}>
                    <td className={cn(receiptTdClassName, 'text-center text-erp-text-muted')}>{index + 1}</td>
                    <td className={cn(receiptTdClassName, 'truncate')} title={line.productCode}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(receiptTdClassName, 'truncate')} title={line.productName}>{line.productName || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(receiptTdClassName, 'text-erp-text-muted')}>{line.unit || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(receiptTdClassName, 'text-right')}>{line.quantity ?? 0}</td>
                    <td className={cn(receiptTdClassName, 'px-1.5')}>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        max={line.quantity}
                        value={lineReceipts[index] ?? ''}
                        disabled={zeroReceive}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const next = [...lineReceipts];
                          next[index] = raw;
                          setLineReceipts(next);
                        }}
                        className="text-right"
                        aria-label={`第${index + 1}行实收数量`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-[12px] text-erp-text">
              <input type="checkbox" checked={zeroReceive} onChange={(event) => setZeroReceive(event.target.checked)} />
              零收（整单按取消结束，不生成其他入库单）
            </label>
            <span className="text-[12px] text-erp-text-muted">申请入库数量合计：{totalRequestQty}</span>
          </div>
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'warehouse-cancel-demo') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="模拟仓库取消回执（Demo）"
        description="演示取消中状态收到仓库回执后的处理：仓库同意则已取消，拒绝则恢复待收货。"
        footer={(
          <>
            <Button
              variant="outline"
              size="compact"
              onClick={() => {
                const latest = latestRow();
                if (!canMockWarehouseCancelRequest(latest)) {
                  blockMismatch('模拟仓库回执');
                  return;
                }
                finish('仓库拒绝取消，已恢复待收货', 'info', applyWarehouseCancelResult(latest, false));
              }}
            >
              仓库拒绝
            </Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const latest = latestRow();
                if (!canMockWarehouseCancelRequest(latest)) {
                  blockMismatch('模拟仓库回执');
                  return;
                }
                finish('已取消', 'success', applyWarehouseCancelResult(latest, true));
              }}
            >
              仓库同意
            </Button>
          </>
        )}
      />
    );
  }

  return null;
}

/** 详情页页头操作：按状态互斥展示，顺序见《其他入库申请单前端Demo版PRD_详情页》§2。 */
export function OtherInboundRequestDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];

  if (canSubmitRequest(row)) actions.push({ id: 'submit', label: '提交', variant: 'outline' });
  if (row.status === 'draft') actions.push({ id: 'delete', label: '删除', variant: 'outline' });
  if (row.status === 'draft') actions.push({ id: 'edit', label: '编辑', variant: 'primary' });
  if (canApproveRequest(row)) actions.push({ id: 'approve', label: '审核', variant: 'primary' });
  if (canWithdrawRequest(row)) actions.push({ id: 'withdraw', label: '撤回', variant: 'outline' });
  if (canRetryPushRequest(row)) actions.push({ id: 'retry', label: '重试推送', variant: 'outline' });
  if (canCancelPendingRequest(row) || canCancelApprovedRequest(row)) actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  if (canApplyCancelRequest(row)) actions.push({ id: 'apply-cancel', label: '取消', variant: 'outline' });
  if (canMockReceiptRequest(row)) actions.push({ id: 'mock-receipt', label: '模拟仓库回传', variant: 'outline' });
  if (canMockWarehouseCancelRequest(row)) actions.push({ id: 'warehouse-cancel-demo', label: '模拟仓库回执', variant: 'outline' });

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
