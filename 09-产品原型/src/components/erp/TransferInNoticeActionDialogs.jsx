import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import {
  applyManualConfirmInNotice,
  applyMockReceiveInNotice,
  applyRetryPushInNotice,
  canManualConfirm,
  canMockReceive,
  canRetryPush,
  loadTransferInNoticeById,
  manualConfirmTypeLabels,
  refreshTransferInNoticeLines,
  resolveManualConfirmType,
  sumTransferInNoticeShortageQty,
  transferInNoticeStatusLabels,
} from '../../lib/transferInNoticeLogic.js';

const confirmTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const confirmHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const confirmThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const confirmRowClassName = 'h-8 border-b border-erp-border-table-row';
const confirmTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

/**
 * 调入通知单模块弹窗：重试推送、模拟接收仓回传。
 * 本期不提供取消弹窗（货已实际发出，取消会让在途失去归属，主PRD §6.4、Q02）。
 * 标题、正文与失败文案见《调入通知单前端Demo版PRD_弹窗与Mock》§2、§4。
 */
export function TransferInNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [actualQty, setActualQty] = useState('');
  const [lineActuals, setLineActuals] = useState([]);

  useEffect(() => {
    if (!dialog) return;
    setActualQty('');
    const lines = refreshTransferInNoticeLines(dialog.row?.lines || []);
    setLineActuals(lines.map((line) => String(line.quantity || 0)));
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  function latestNotice() {
    return loadTransferInNoticeById(row?.id) || row;
  }

  if (type === 'retry') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="重试推送接收仓"
        description="将对本通知单重新发送接收仓，不重新生成、不重复回写。发送结果不确定时请先核实仓库是否已接收。"
        confirmLabel="确认重试"
        onConfirm={() => finish('已重新推送接收仓', 'success', applyRetryPushInNotice(row))}
      />
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
          description={`当前单据状态为${transferInNoticeStatusLabels[latest?.status] || latest?.status || '-'}，不可执行人工确认`}
          footer={<Button variant="primary" size="compact" onClick={onClose}>关闭</Button>}
        />
      );
    }

    const lines = refreshTransferInNoticeLines(latest.lines || []);
    const statusLabel = transferInNoticeStatusLabels[latest?.status] || '';
    const typeLabel = `${manualConfirmTypeLabels[confirmType]}（${statusLabel}）`;
    const isFinish = confirmType === 'finish';

    function handleManualConfirm() {
      try {
        const next = applyManualConfirmInNotice(latest, {
          confirmType,
          lineActuals,
        });
        const message = confirmType === 'finish'
          ? '已记录人工确认结果：执行结束（已形成演示用调入端直接调拨单，待审核）'
          : '已记录人工确认结果：确认接单';
        finish(message, 'success', loadTransferInNoticeById(next.id) || next);
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
              <RadioGroupItem value={confirmType} id="transfer-in-notice-manual-confirm-type" aria-label={typeLabel} />
              <label htmlFor="transfer-in-notice-manual-confirm-type" className="cursor-pointer text-[12px] text-erp-text">{typeLabel}</label>
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
                    <th className={cn(confirmThClassName, 'text-right')}>通知调入数量</th>
                    <th className={cn(confirmThClassName, 'text-right')}>实际调入数量</th>
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
                          min="1"
                          step="1"
                          value={lineActuals[index] ?? ''}
                          onChange={(event) => {
                            const raw = event.target.value;
                            const next = [...lineActuals];
                            next[index] = raw;
                            setLineActuals(next);
                          }}
                          className="text-right"
                          aria-label={`第${index + 1}行实际调入数量`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[12px] text-erp-text-muted">
              实际调入必须大于0；回传0属零调入异常，不通过人工确认收口。演示说明：确认执行结束且校验通过时形成演示用调入端直接调拨单（待审核，演示数据）；审核通过后才在途减、接收仓加并回写主单自动完结，原型不提供该结果单的审核入口。
            </p>
          </>
        )}

        {confirmType === 'accept' && (
          <p className="mt-3 text-[12px] text-erp-text-muted">
            确认接单视同接收仓已接收本通知，转待收货；不生成结果单。
          </p>
        )}
      </SimpleDialog>
    );
  }

  if (type === 'mock-receive') {
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
                try {
                  const outcome = applyMockReceiveInNotice(row, Number(actualQty));
                  if (outcome.status === 'zero_rejected') {
                    onNotify?.('实际调入必须大于0，回传已被拒绝，请改为大于0后重新回传', 'warning');
                    onComplete?.({ row: outcome.row, keepOpen: true });
                    return;
                  }
                  const shortage = sumTransferInNoticeShortageQty(outcome.row.lines);
                  finish(
                    shortage > 0
                      ? `仓库回传已确认，少收 ${shortage} 件留在途，主单已自动完结`
                      : '仓库回传已确认，主单已自动完结',
                    'success',
                    loadTransferInNoticeById(row.id) || outcome.row,
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
          <FormField label="实际调入数量 *">
            <Input
              type="number"
              min="0"
              step="1"
              value={actualQty}
              placeholder={`请输入实际调入数量（通知调入数量 ${row.totalQuantity || 0}）`}
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

  return null;
}

/**
 * 调入通知单详情页头操作：返回列表之后按状态互斥展示（主PRD §6.4）。
 * 仅推送失败提供重试推送；本期不提供取消；待收货提供回传 Mock。
 */
export function TransferInNoticeDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];
  if (canRetryPush(row)) actions.push({ id: 'retry', label: '重试推送', variant: 'outline' });
  if (canManualConfirm(row)) actions.push({ id: 'manual-confirm', label: '人工确认', variant: 'outline' });
  if (canMockReceive(row)) actions.push({ id: 'mock-receive', label: '模拟接收仓回传(Mock)', variant: 'outline' });

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
