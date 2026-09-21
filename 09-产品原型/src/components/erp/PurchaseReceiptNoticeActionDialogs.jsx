import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog, InfoDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import {
  applyApplyCancelNotice,
  applyCancelNotice,
  applyMockReceipt,
  applyRetryPush,
  applyWarehouseCancelResult,
  canEditRemark,
  clampMockLineReceipt,
  refreshNoticeLines,
} from '../../lib/receiptNoticeLogic.js';

const mockReceiptTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const mockReceiptHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const mockReceiptThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const mockReceiptRowClassName = 'h-8 border-b border-erp-border-table-row';
const mockReceiptTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

export function PurchaseReceiptNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [cancelReason, setCancelReason] = useState('');
  const [lineReceipts, setLineReceipts] = useState([]);
  const [zeroReceive, setZeroReceive] = useState(false);

  useEffect(() => {
    if (!dialog) return;
    setCancelReason('');
    setZeroReceive(false);
    const lines = refreshNoticeLines(dialog.row?.lines || []);
    setLineReceipts(lines.map((line) => String(line.notifyQty || 0)));
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  if (type === 'cancel') {
    const description = row.status === 'push_failed'
      ? '取消后通知不再执行，不可撤销，并释放订单占用额度。请确认仓库尚未接收本通知。'
      : '取消后通知不再执行，不可撤销，并释放订单占用额度。';

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消采购收货通知单"
        description={description}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => finish('采购收货通知单已取消', 'success', applyCancelNotice(row, cancelReason.trim()))}
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

  if (type === 'apply-cancel') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消采购收货通知单"
        description="单据已推送仓库，取消需等待仓库回执。取消期间通知仍占用订单额度。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => finish('已发起取消，等待仓库回执', 'success', applyApplyCancelNotice(row, cancelReason.trim()))}
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
        onConfirm={() => finish('已重新推送仓库', 'success', applyRetryPush(row))}
      />
    );
  }

  if (type === 'mock-receipt') {
    const lines = refreshNoticeLines(row.lines || []);

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟仓库回传（Demo）"
        description="各行实收数量可小于或等于通知数量，超过通知数量将自动调整为通知数量。勾选零收则整单按取消结束。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  const payload = {
                    zeroReceive,
                    lineReceipts: zeroReceive
                      ? []
                      : lines.map((line, index) => clampMockLineReceipt(lineReceipts[index], line.notifyQty)),
                  };
                  const nextRow = applyMockReceipt(row, payload);
                  const shortTotal = (nextRow.lines || []).reduce((sum, line) => sum + Number(line.shortQty || 0), 0);
                  const message = zeroReceive
                    ? '采购收货通知单已取消（零收）'
                    : shortTotal > 0
                      ? `仓库回传已确认，缺收 ${shortTotal} 件`
                      : '仓库回传已确认';
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
            <table className={mockReceiptTableClassName} style={{ minWidth: '720px' }}>
              <colgroup>
                <col className="w-10" />
                <col className="w-[108px]" />
                <col className="w-[108px]" />
                <col className="w-[140px]" />
                <col className="w-[88px]" />
                <col className="w-[96px]" />
              </colgroup>
              <thead className={mockReceiptHeadClassName}>
                <tr>
                  <th className={mockReceiptThClassName}>行号</th>
                  <th className={mockReceiptThClassName}>商品编码</th>
                  <th className={mockReceiptThClassName}>商品条码</th>
                  <th className={mockReceiptThClassName}>商品名称</th>
                  <th className={cn(mockReceiptThClassName, 'text-right')}>通知数量</th>
                  <th className={cn(mockReceiptThClassName, 'text-right')}>实收数量</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={line.id || index} className={mockReceiptRowClassName}>
                    <td className={cn(mockReceiptTdClassName, 'text-center text-erp-text-muted')}>{index + 1}</td>
                    <td className={cn(mockReceiptTdClassName, 'truncate')} title={line.productCode}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(mockReceiptTdClassName, 'truncate text-erp-text-muted')} title={line.barcode}>{line.barcode || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(mockReceiptTdClassName, 'truncate')} title={line.productName}>{line.productName || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(mockReceiptTdClassName, 'text-right')}>{line.notifyQty ?? 0}</td>
                    <td className={cn(mockReceiptTdClassName, 'px-1.5')}>
                      <Input
                        type="number"
                        min="0"
                        max={line.notifyQty}
                        value={lineReceipts[index] ?? ''}
                        disabled={zeroReceive}
                        onChange={(event) => {
                          const raw = event.target.value;
                          const notifyQty = Number(line.notifyQty || 0);
                          const next = [...lineReceipts];
                          if (raw === '') {
                            next[index] = '';
                            setLineReceipts(next);
                            return;
                          }
                          const parsed = Number(raw);
                          if (!Number.isFinite(parsed)) return;
                          if (parsed > notifyQty) {
                            next[index] = String(notifyQty);
                            setLineReceipts(next);
                            onNotify?.('实收数量不能超过通知数量，已自动调整为通知数量', 'warning');
                            return;
                          }
                          next[index] = raw;
                          setLineReceipts(next);
                        }}
                        onBlur={() => {
                          const notifyQty = Number(line.notifyQty || 0);
                          const clamped = clampMockLineReceipt(lineReceipts[index], notifyQty);
                          if (String(lineReceipts[index] ?? '') !== String(clamped)) {
                            const next = [...lineReceipts];
                            next[index] = String(clamped);
                            setLineReceipts(next);
                          }
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
          <label className="flex items-center gap-2 text-[12px] text-erp-text">
            <input type="checkbox" checked={zeroReceive} onChange={(event) => setZeroReceive(event.target.checked)} />
            零收（整单按取消结束）
          </label>
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
        description="演示取消中状态收到仓库回执后的处理。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={() => finish('仓库拒绝取消', 'info', applyWarehouseCancelResult(row, false))}>仓库拒绝</Button>
            <Button variant="primary" size="compact" onClick={() => finish('采购收货通知单已取消', 'success', applyWarehouseCancelResult(row, true))}>仓库同意</Button>
          </>
        )}
      />
    );
  }

  return null;
}

export function PurchaseReceiptNoticeDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];

  if (canEditRemark(row)) {
    actions.push({ id: 'edit', label: '编辑', variant: 'primary' });
  }
  if (row.status === 'push_failed') {
    actions.push({ id: 'retry', label: '重试推送', variant: 'outline' });
  }
  if (row.status === 'pending_push' || row.status === 'push_failed') {
    actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  }
  if (row.status === 'pending_receive') {
    actions.push({ id: 'apply-cancel', label: '取消', variant: 'outline' });
    actions.push({ id: 'mock-receipt', label: '模拟仓库回传', variant: 'outline' });
  }
  if (row.status === 'cancelling') {
    actions.push({ id: 'warehouse-cancel-demo', label: '模拟仓库回执', variant: 'outline' });
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
