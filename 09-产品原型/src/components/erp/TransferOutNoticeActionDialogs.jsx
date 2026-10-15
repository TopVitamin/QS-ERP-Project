import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { REMARK_500_MAX } from '../../data/inventoryStockData.js';
import {
  applyCancelOutNotice,
  applyManualConfirmOutNotice,
  applyMockShipOutNotice,
  applyRetryPushOutNotice,
  canCancelNotice,
  canManualConfirm,
  canMockShip,
  canRetryPush,
  loadTransferOutNoticeById,
  manualConfirmTypeLabels,
  refreshTransferOutNoticeLines,
  resolveManualConfirmType,
  sumTransferOutNoticeRemainingQty,
  transferOutNoticeStatusLabels,
} from '../../lib/transferOutNoticeLogic.js';

const confirmTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const confirmHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const confirmThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const confirmRowClassName = 'h-8 border-b border-erp-border-table-row';
const confirmTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

/**
 * 调出通知单模块弹窗：重试推送、取消（待推送／推送失败、待发货）、模拟仓库回传。
 * 标题、正文与失败文案见《调出通知单前端Demo版PRD_弹窗与Mock》§2、§3。
 */
export function TransferOutNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [reason, setReason] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [lineActuals, setLineActuals] = useState([]);
  const [zeroOut, setZeroOut] = useState(false);
  const [cancelResult, setCancelResult] = useState('agree');

  useEffect(() => {
    if (!dialog) return;
    setReason('');
    setActualQty('');
    setZeroOut(false);
    setCancelResult('agree');
    const lines = refreshTransferOutNoticeLines(dialog.row?.lines || []);
    setLineActuals(lines.map((line) => String(line.quantity || 0)));
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  function latestNotice() {
    return loadTransferOutNoticeById(row?.id) || row;
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

  if (type === 'manual-confirm') {
    const latest = latestNotice();
    const confirmType = resolveManualConfirmType(latest);

    if (!confirmType) {
      // 状态已变化：不进入成功流，按主PRD §6.4 阻断提示
      return (
        <SimpleDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="人工确认（补记仓库实际结果）"
          description={`当前单据状态为${transferOutNoticeStatusLabels[latest?.status] || latest?.status || '-'}，不可执行人工确认`}
          footer={<Button variant="primary" size="compact" onClick={onClose}>关闭</Button>}
        />
      );
    }

    const lines = refreshTransferOutNoticeLines(latest.lines || []);
    const statusLabel = transferOutNoticeStatusLabels[latest?.status] || '';
    const typeLabel = `${manualConfirmTypeLabels[confirmType]}（${statusLabel}）`;
    const isFinish = confirmType === 'finish';

    function handleManualConfirm() {
      try {
        const next = applyManualConfirmOutNotice(latest, {
          confirmType,
          zeroOut,
          lineActuals,
          cancelResult,
        });
        const message = confirmType === 'finish'
          ? (zeroOut
            ? '已记录人工确认结果：零调出（来源主单按零出取消）'
            : '已记录人工确认结果：执行结束（已形成演示用调出端直接调拨单，待审核）')
          : confirmType === 'accept'
            ? '已记录人工确认结果：确认接单'
            : (cancelResult === 'agree'
              ? '已记录人工确认结果：仓库同意取消'
              : '已记录人工确认结果：仓库拒绝取消，恢复待发货');
        finish(message, 'success', loadTransferOutNoticeById(next.id) || next);
      } catch (error) {
        onNotify?.(error.message || '人工确认失败，请稍后重试', 'warning');
      }
    }

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="人工确认（补记仓库实际结果）"
        description="只用于已交给仓库、接口拿不到结果的通知；确认前请先与仓库核实实际结果。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button variant="primary" size="compact" onClick={handleManualConfirm}>确认</Button>
          </>
        )}
      >
        <div className="space-y-1.5">
          <span className="text-[12px] text-erp-text">确认类型</span>
          <RadioGroup value={confirmType} aria-label="确认类型" className="h-7 gap-4">
            <span className="flex items-center gap-1.5">
              <RadioGroupItem value={confirmType} id="transfer-out-notice-manual-confirm-type" aria-label={typeLabel} />
              <label htmlFor="transfer-out-notice-manual-confirm-type" className="cursor-pointer text-[12px] text-erp-text">{typeLabel}</label>
            </span>
          </RadioGroup>
        </div>

        {isFinish && (
          <>
            <div className="table-scroll mt-3 overflow-x-auto">
              <table className={confirmTableClassName} style={{ minWidth: '760px' }}>
                <colgroup>
                  <col className="w-10" />
                  <col className="w-[112px]" />
                  <col className="w-[120px]" />
                  <col className="w-[150px]" />
                  <col className="w-[120px]" />
                  <col className="w-[120px]" />
                </colgroup>
                <thead className={confirmHeadClassName}>
                  <tr>
                    <th className={confirmThClassName}>行号</th>
                    <th className={confirmThClassName}>商品编码</th>
                    <th className={confirmThClassName}>商品条码</th>
                    <th className={confirmThClassName}>商品名称</th>
                    <th className={cn(confirmThClassName, 'text-right')}>通知调出数量</th>
                    <th className={cn(confirmThClassName, 'text-right')}>实际调出数量</th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id || index} className={confirmRowClassName}>
                      <td className={cn(confirmTdClassName, 'text-center text-erp-text-muted')}>{index + 1}</td>
                      <td className={cn(confirmTdClassName, 'truncate')} title={line.productCode}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                      <td className={cn(confirmTdClassName, 'truncate text-erp-text-muted')} title={line.barcode}>{line.barcode || EMPTY_PLACEHOLDER}</td>
                      <td className={cn(confirmTdClassName, 'truncate')} title={line.productName}>{line.productName || EMPTY_PLACEHOLDER}</td>
                      <td className={cn(confirmTdClassName, 'text-right')}>{line.quantity ?? 0}</td>
                      <td className={cn(confirmTdClassName, 'px-1.5')}>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={lineActuals[index] ?? ''}
                          disabled={zeroOut}
                          onChange={(event) => {
                            const raw = event.target.value;
                            const next = [...lineActuals];
                            next[index] = raw;
                            setLineActuals(next);
                          }}
                          className="text-right"
                          aria-label={`第${index + 1}行实际调出数量`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[12px] text-erp-text">
              <input type="checkbox" checked={zeroOut} onChange={(event) => setZeroOut(event.target.checked)} />
              零调出（来源主单按零出取消，不生成后续单据）
            </label>
            <p className="mt-3 text-[12px] text-erp-text-muted">
              演示说明：确认执行结束且实际调出&gt;0 时形成演示用调出端直接调拨单（待审核，演示数据）；审核通过后才调出仓减、在途加，消耗实出预占、释放未发预占并按实际调出量生成调入通知单，原型不提供该结果单的审核入口。
            </p>
          </>
        )}

        {confirmType === 'cancel_result' && (
          <>
            <div className="mt-3 space-y-1.5">
              <span className="text-[12px] text-erp-text">取消结果 *</span>
              <RadioGroup value={cancelResult} onValueChange={setCancelResult} aria-label="取消结果" className="h-7 gap-4">
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="agree" id="transfer-out-notice-cancel-agree" aria-label="仓库同意取消" />
                  <label htmlFor="transfer-out-notice-cancel-agree" className="cursor-pointer text-[12px] text-erp-text">仓库同意取消</label>
                </span>
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="reject" id="transfer-out-notice-cancel-reject" aria-label="仓库拒绝取消" />
                  <label htmlFor="transfer-out-notice-cancel-reject" className="cursor-pointer text-[12px] text-erp-text">仓库拒绝取消</label>
                </span>
              </RadioGroup>
            </div>
            <p className="mt-3 text-[12px] text-erp-text-muted">
              需已取得仓库明确回复：仓库同意→已取消并释放未执行预占；仓库拒绝→恢复待发货、预占继续占用。无明确回复不得确认。
            </p>
          </>
        )}

        {confirmType === 'accept' && (
          <p className="mt-3 text-[12px] text-erp-text-muted">
            确认接单视同调出仓已接收本通知，转待发货；不生成结果单。
          </p>
        )}
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
  if (canManualConfirm(row)) actions.push({ id: 'manual-confirm', label: '人工确认', variant: 'outline' });
  if (canCancelNotice(row)) actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  if (canMockShip(row)) actions.push({ id: 'mock-ship', label: '模拟仓库回传(Mock)', variant: 'outline' });

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
