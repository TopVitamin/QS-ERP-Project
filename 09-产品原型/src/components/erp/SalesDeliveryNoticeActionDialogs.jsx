import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import {
  applyApplyCancelNotice,
  applyCancelNotice,
  applyMockShip,
  applyRetryPush,
  applyWarehouseCancelResult,
  canEditRemark,
  clampMockLineShip,
  refreshNoticeLines,
} from '../../lib/salesDeliveryNoticeLogic.js';

const mockShipTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const mockShipHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const mockShipThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const mockShipRowClassName = 'h-8 border-b border-erp-border-table-row';
const mockShipTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

export function SalesDeliveryNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [cancelReason, setCancelReason] = useState('');
  const [lineShipments, setLineShipments] = useState([]);
  const [zeroShip, setZeroShip] = useState(false);

  useEffect(() => {
    if (!dialog) return;
    setCancelReason('');
    setZeroShip(false);
    const lines = refreshNoticeLines(dialog.row?.lines || []);
    setLineShipments(lines.map((line) => String(line.notifyQty || 0)));
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
        title="取消销售发货通知单"
        description={description}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => finish('销售发货通知单已取消', 'success', applyCancelNotice(row, cancelReason.trim()))}
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
        title="取消销售发货通知单"
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

  if (type === 'mock-ship') {
    const lines = refreshNoticeLines(row.lines || []);

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟仓库回传（Demo）"
        description="各行实出不能超过通知数量；少于通知量按缺量结束。勾选零出则整单按取消结束。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  const payload = {
                    zeroShip,
                    lineShipments: zeroShip
                      ? []
                      : lines.map((line, index) => clampMockLineShip(lineShipments[index], line.notifyQty)),
                  };
                  const nextRow = applyMockShip(row, payload);
                  const shortTotal = (nextRow.lines || []).reduce((sum, line) => sum + Number(line.shortQty || 0), 0);
                  const message = zeroShip
                    ? '销售发货通知单已取消（零出）'
                    : shortTotal > 0
                      ? `仓库回传已确认，缺出 ${shortTotal} 件`
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
                          const clamped = clampMockLineShip(lineShipments[index], notifyQty);
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
            <Button variant="primary" size="compact" onClick={() => finish('销售发货通知单已取消', 'success', applyWarehouseCancelResult(row, true))}>仓库同意</Button>
          </>
        )}
      />
    );
  }

  return null;
}

export function SalesDeliveryNoticeDetailHeaderActions({ row, onAction }) {
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
  if (row.status === 'pending_ship') {
    actions.push({ id: 'apply-cancel', label: '取消', variant: 'outline' });
    actions.push({ id: 'mock-ship', label: '模拟仓库回传', variant: 'outline' });
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
