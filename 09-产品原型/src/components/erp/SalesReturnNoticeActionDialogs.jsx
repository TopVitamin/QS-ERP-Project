import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { MockCallbackLineTable } from './MockCallbackLineTable.jsx';
import {
  applyApplyCancelSalesReturnNotice,
  applyCancelSalesReturnNotice,
  applyManualConfirm,
  applyMockSalesReturnReceipt,
  applyRetrySalesReturnPush,
  canEditSalesReturnNoticeRemark,
  canManualConfirm,
  clampMockLineReceipt,
  manualConfirmTypeLabels,
  manualConfirmTypesForStatus,
  refreshSalesReturnNoticeLines,
} from '../../lib/salesReturnNoticeLogic.js';

export function SalesReturnNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [cancelReason, setCancelReason] = useState('');
  const [lineReceipts, setLineReceipts] = useState([]);
  const [zeroReceive, setZeroReceive] = useState(false);
  const [confirmType, setConfirmType] = useState('');
  const [cancelAgreed, setCancelAgreed] = useState('');

  useEffect(() => {
    if (!dialog) return;
    setCancelReason('');
    setZeroReceive(false);
    setCancelAgreed('');
    setConfirmType(dialog.confirmType || manualConfirmTypesForStatus(dialog.row?.status)[0] || '');
    const lines = refreshSalesReturnNoticeLines(dialog.row?.lines || []);
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
      ? '取消后通知不再执行，不可撤销，并回补退货单可下推量。请确认仓库尚未接收本通知。'
      : '取消后通知不再执行，不可撤销，并回补退货单可下推量。';

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消销退收货通知单"
        description={description}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => finish('销退收货通知单已取消', 'success', applyCancelSalesReturnNotice(row, cancelReason.trim()))}
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
        title="取消销退收货通知单"
        description="单据已推送仓库，取消需等待仓库回执。取消期间通知仍占用退货单可下推量。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!cancelReason.trim()}
              onClick={() => finish('已发起取消，等待仓库回执', 'success', applyApplyCancelSalesReturnNotice(row, cancelReason.trim()))}
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
        onConfirm={() => finish('已重新推送仓库', 'success', applyRetrySalesReturnPush(row))}
      />
    );
  }

  if (type === 'mock-receipt') {
    const lines = refreshSalesReturnNoticeLines(row.lines || []);

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟仓库回传（Demo）"
        description="各行实收不能超过通知数量；少于通知量按缺量结束。勾选零收则整单按取消结束。"
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
                  const nextRow = applyMockSalesReturnReceipt(row, payload);
                  const shortTotal = (nextRow.lines || []).reduce((sum, line) => sum + Number(line.shortQty || 0), 0);
                  const message = zeroReceive
                    ? '销退收货通知单已取消（零收）'
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
          <MockCallbackLineTable
            lines={lines}
            values={lineReceipts}
            onValuesChange={setLineReceipts}
            clamp={clampMockLineReceipt}
            quantityLabel="实收数量"
            disabled={zeroReceive}
            onNotify={onNotify}
          />
          <label className="flex items-center gap-2 text-[12px] text-erp-text">
            <input type="checkbox" checked={zeroReceive} onChange={(event) => setZeroReceive(event.target.checked)} />
            零收（整单按取消结束）
          </label>
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'manual-confirm') {
    const lines = refreshSalesReturnNoticeLines(row.lines || []);
    const typeOptions = manualConfirmTypesForStatus(row.status);
    const isFinish = confirmType === 'finish';

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
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  if (!confirmType) {
                    onNotify?.('请选择确认类型', 'warning');
                    return;
                  }
                  if (confirmType === 'cancel_result' && !cancelAgreed) {
                    onNotify?.('请选择仓库的取消回复', 'warning');
                    return;
                  }
                  const payload = {
                    confirmType,
                    zeroReceive,
                    cancelAgreed: cancelAgreed === 'agree',
                    lineReceipts: zeroReceive
                      ? []
                      : lines.map((line, index) => clampMockLineReceipt(lineReceipts[index], line.notifyQty)),
                  };
                  const nextRow = applyManualConfirm(row, payload);
                  const message = confirmType === 'accept'
                    ? '已记录人工确认：确认接单'
                    : confirmType === 'cancel_result'
                      ? `已记录人工确认：取消结果（${cancelAgreed === 'agree' ? '仓库同意取消' : '仓库拒绝取消'}）`
                      : zeroReceive
                        ? '已记录人工确认：执行结束（整单零收，通知单已取消）'
                        : '已记录人工确认：执行结束（已生成销退入库单）';
                  finish(message, 'success', nextRow);
                } catch (error) {
                  onNotify?.(error.message || '人工确认失败', 'warning');
                }
              }}
            >
              确认
            </Button>
          </>
        )}
      >
        <div className="mt-3 space-y-3">
          <div className="space-y-1.5">
            <span className="text-[12px] text-erp-text">确认类型 *</span>
            <RadioGroup value={confirmType} onValueChange={setConfirmType} aria-label="确认类型" className="h-7 gap-4">
              {typeOptions.map((value) => (
                <span key={value} className="flex items-center gap-1.5">
                  <RadioGroupItem value={value} id={`sales-return-notice-confirm-${value}`} aria-label={manualConfirmTypeLabels[value]} />
                  <label htmlFor={`sales-return-notice-confirm-${value}`} className="cursor-pointer text-[12px] text-erp-text">
                    {manualConfirmTypeLabels[value]}
                  </label>
                </span>
              ))}
            </RadioGroup>
          </div>
          {isFinish && (
            <>
              <MockCallbackLineTable
                lines={lines}
                values={lineReceipts}
                onValuesChange={setLineReceipts}
                clamp={clampMockLineReceipt}
                quantityLabel="实收数量"
                disabled={zeroReceive}
                onNotify={onNotify}
              />
              <label className="flex items-center gap-2 text-[12px] text-erp-text">
                <input type="checkbox" checked={zeroReceive} onChange={(event) => setZeroReceive(event.target.checked)} />
                零收（整单按取消结束）
              </label>
            </>
          )}
          {confirmType === 'cancel_result' && (
            <div className="space-y-1.5">
              <span className="text-[12px] text-erp-text">仓库取消回复 *（请先与仓库核实）</span>
              <RadioGroup value={cancelAgreed} onValueChange={setCancelAgreed} aria-label="仓库取消回复" className="h-7 gap-4">
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="agree" id="sales-return-notice-cancel-agree" aria-label="仓库同意取消" />
                  <label htmlFor="sales-return-notice-cancel-agree" className="cursor-pointer text-[12px] text-erp-text">仓库同意取消</label>
                </span>
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="reject" id="sales-return-notice-cancel-reject" aria-label="仓库拒绝取消" />
                  <label htmlFor="sales-return-notice-cancel-reject" className="cursor-pointer text-[12px] text-erp-text">仓库拒绝取消</label>
                </span>
              </RadioGroup>
            </div>
          )}
          <p className="text-[12px] text-erp-text-muted">
            演示数据：本地Mock补记，不接真实仓库接口。正式流程中确认执行结束生成的结果单走草稿→待审核，原型结果单为只读已审核态，提交后直接生成已审核销退入库单并记账；不替代通知单上事先选择的虚拟入库，也不能无来源新建入库单。
          </p>
        </div>
      </SimpleDialog>
    );
  }

  return null;
}

export function SalesReturnNoticeDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];

  if (canEditSalesReturnNoticeRemark(row)) {
    actions.push({ id: 'edit', label: '编辑', variant: 'primary' });
  }
  if (row.status === 'push_failed') {
    actions.push({ id: 'retry', label: '重试推送', variant: 'outline' });
  }
  if (row.status === 'pending_push' || row.status === 'push_failed') {
    actions.push({ id: 'cancel', label: '取消', variant: 'outline' });
  }
  // 人工确认：已交给仓库且接口拿不到结果时补记（推送中／待收货／取消中；弹窗与Mock §7）
  if (canManualConfirm(row)) {
    actions.push({ id: 'manual-confirm', label: '人工确认', variant: 'outline' });
  }
  if (row.status === 'pending_receive') {
    actions.push({ id: 'apply-cancel', label: '取消', variant: 'outline' });
    actions.push({ id: 'mock-receipt', label: '模拟仓库回传（Demo）', variant: 'outline' });
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
