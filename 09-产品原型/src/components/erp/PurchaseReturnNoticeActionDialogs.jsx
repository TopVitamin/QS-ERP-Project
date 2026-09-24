import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import {
  applyApplyCancelReturnNotice,
  applyCancelReturnNotice,
  applyMockReturnShipment,
  applyRetryReturnPush,
  canApplyCancelReturnNotice,
  canCancelReturnNotice,
  canEditReturnNoticeRemark,
  canMockReturnShipment,
  canRetryReturnPush,
  clampMockReturnLineShipment,
  loadReturnNoticeById,
  refreshReturnNoticeLines,
} from '../../lib/purchaseReturnNoticeLogic.js';

const mockShipTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const mockShipHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const mockShipThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const mockShipRowClassName = 'h-8 border-b border-erp-border-table-row';
const mockShipTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

const STATE_CHANGED_MESSAGE = '操作失败，单据状态已变更，请刷新后重试';

/**
 * 采退发货通知单弹窗：取消（待推送/推送失败）、取消（待发货进入取消中）、重试推送、
 * Demo 模拟仓库出库回传（弹窗与Mock PRD §2～§5）。
 */
export function PurchaseReturnNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [cancelReason, setCancelReason] = useState('');
  const [lineShipments, setLineShipments] = useState([]);
  const [zeroShip, setZeroShip] = useState(false);

  useEffect(() => {
    if (!dialog) return;
    setCancelReason('');
    setZeroShip(false);
    const lines = refreshReturnNoticeLines(dialog.row?.lines || []);
    setLineShipments(lines.map((line) => String(line.notifyQty || 0)));
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  function latestRow() {
    return loadReturnNoticeById(row?.id) || row;
  }

  function blockStateChanged() {
    onNotify?.(STATE_CHANGED_MESSAGE, 'warning');
    onClose?.();
  }

  if (type === 'cancel' || type === 'apply-cancel') {
    const isApplyCancel = type === 'apply-cancel';
    const description = isApplyCancel
      ? '单据已推送仓库，取消需等待仓库回执。取消期间通知仍占用退货单可下推量。'
      : `取消后通知不再执行，不可撤销，并释放退货单可下推量。${row.status === 'push_failed' ? '请确认仓库尚未接收本通知。' : ''}`;

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消采退发货通知单"
        description={description}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => {
                const latest = latestRow();
                if (isApplyCancel) {
                  if (!canApplyCancelReturnNotice(latest)) {
                    blockStateChanged();
                    return;
                  }
                  finish('已发起取消，等待仓库回执', 'success', applyApplyCancelReturnNotice(latest, cancelReason.trim()));
                  return;
                }
                if (!canCancelReturnNotice(latest)) {
                  blockStateChanged();
                  return;
                }
                finish('采退发货通知单已取消', 'success', applyCancelReturnNotice(latest, cancelReason.trim()));
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

  if (type === 'retry') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="重试推送仓库"
        description="将重新向仓库发送本通知，请确认失败原因已处理。"
        confirmLabel="确认重试"
        onConfirm={() => {
          const latest = latestRow();
          if (!canRetryReturnPush(latest)) {
            blockStateChanged();
            return;
          }
          finish('已重新推送仓库', 'success', applyRetryReturnPush(latest));
        }}
      />
    );
  }

  if (type === 'mock-ship') {
    const lines = refreshReturnNoticeLines(row.lines || []);

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟仓库出库回传（Demo）"
        description="各行实出数量不能超过通知数量；超过将自动调整为通知数量并提示。实出少于通知量按缺量结束本次执行。勾选零出则整单按取消结束。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  const latest = latestRow();
                  if (!canMockReturnShipment(latest)) {
                    blockStateChanged();
                    return;
                  }
                  const payload = {
                    zeroShip,
                    lineShipments: zeroShip
                      ? []
                      : lines.map((line, index) => clampMockReturnLineShipment(lineShipments[index], line.notifyQty)),
                  };
                  const nextRow = applyMockReturnShipment(latest, payload);
                  const shortTotal = (nextRow?.lines || []).reduce((sum, line) => sum + Number(line.shortQty || 0), 0);
                  const message = zeroShip
                    ? '采退发货通知单已取消（零出）'
                    : shortTotal > 0
                      ? `仓库回传已确认（Demo），缺出 ${shortTotal} 件`
                      : '仓库回传已确认（Demo）';
                  finish(message, 'success', nextRow);
                } catch (error) {
                  onNotify?.(error.message || '回传失败', 'warning');
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
            <table className={mockShipTableClassName} style={{ minWidth: '720px' }}>
              <colgroup>
                <col className="w-10" />
                <col className="w-[108px]" />
                <col className="w-[108px]" />
                <col className="w-[140px]" />
                <col className="w-[88px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead className={mockShipHeadClassName}>
                <tr>
                  <th className={mockShipThClassName}>行号</th>
                  <th className={mockShipThClassName}>商品编码</th>
                  <th className={mockShipThClassName}>商品条码</th>
                  <th className={mockShipThClassName}>商品名称</th>
                  <th className={cn(mockShipThClassName, 'text-right')}>通知数量</th>
                  <th className={cn(mockShipThClassName, 'text-right')}>实出数量</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id || index} className={mockShipRowClassName}>
                    <td className={cn(mockShipTdClassName, 'text-center text-erp-text-muted')}>{index + 1}</td>
                    <td className={cn(mockShipTdClassName, 'truncate')} title={line.productCode}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(mockShipTdClassName, 'truncate text-erp-text-muted')} title={line.barcode}>{line.barcode || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(mockShipTdClassName, 'truncate')} title={line.productName}>{line.productName || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(mockShipTdClassName, 'text-right')}>{line.notifyQty ?? 0}</td>
                    <td className={cn(mockShipTdClassName, 'px-1.5')}>
                      <Input
                        type="number"
                        min="0"
                        max={line.notifyQty}
                        value={lineShipments[index] ?? ''}
                        disabled={zeroShip}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const notifyQty = Number(line.notifyQty || 0);
                          const next = [...lineShipments];
                          if (raw === '') {
                            next[index] = '';
                            setLineShipments(next);
                            return;
                          }
                          const parsed = Number(raw);
                          if (!Number.isFinite(parsed)) return;
                          if (parsed > notifyQty) {
                            next[index] = String(notifyQty);
                            setLineShipments(next);
                            onNotify?.('实出数量不能超过通知数量，已自动调整为通知数量', 'warning');
                            return;
                          }
                          next[index] = raw;
                          setLineShipments(next);
                        }}
                        onBlur={() => {
                          const notifyQty = Number(line.notifyQty || 0);
                          const clamped = clampMockReturnLineShipment(lineShipments[index], notifyQty);
                          if (String(lineShipments[index] ?? '') !== String(clamped)) {
                            const next = [...lineShipments];
                            next[index] = String(clamped);
                            setLineShipments(next);
                          }
                        }}
                        className="text-right"
                        aria-label={`第${index + 1}行实出数量`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <label className="flex items-center gap-2 text-[12px] text-erp-text">
            <input type="checkbox" checked={zeroShip} onChange={(event) => setZeroShip(event.target.checked)} />
            零出（整单按取消结束）
          </label>
        </div>
      </SimpleDialog>
    );
  }

  return null;
}

/** 详情页页头业务按钮：返回列表之后按单据状态互斥展示（主PRD §6.4、详情页骨架）。 */
export function PurchaseReturnNoticeDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];

  if (canEditReturnNoticeRemark(row)) {
    actions.push({ id: 'edit', label: '编辑', variant: 'primary' });
  }
  if (canRetryReturnPush(row)) {
    actions.push({ id: 'retry', label: '重试推送', variant: 'outline' });
  }
  if (canCancelReturnNotice(row)) {
    actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  }
  if (canApplyCancelReturnNotice(row)) {
    actions.push({ id: 'apply-cancel', label: '取消', variant: 'outline' });
  }
  if (canMockReturnShipment(row)) {
    actions.push({ id: 'mock-ship', label: '模拟仓库出库回传（Demo）', variant: 'outline' });
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
