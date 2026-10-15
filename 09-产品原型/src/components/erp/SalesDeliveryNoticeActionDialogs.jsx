import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { MockCallbackLineTable } from './MockCallbackLineTable.jsx';
import {
  applyApplyCancelNotice,
  applyCancelNotice,
  applyManualConfirm,
  applyMockShip,
  applyRetryPush,
  applyWarehouseCancelResult,
  canEditRemark,
  canManualConfirm,
  clampMockLineShip,
  manualConfirmTypeLabels,
  manualConfirmTypesForStatus,
  refreshNoticeLines,
} from '../../lib/salesDeliveryNoticeLogic.js';

export function SalesDeliveryNoticeActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [cancelReason, setCancelReason] = useState('');
  const [lineShipments, setLineShipments] = useState([]);
  const [zeroShip, setZeroShip] = useState(false);
  const [confirmType, setConfirmType] = useState('');
  const [cancelAgreed, setCancelAgreed] = useState('');

  useEffect(() => {
    if (!dialog) return;
    setCancelReason('');
    setZeroShip(false);
    setCancelAgreed('');
    setConfirmType(dialog.confirmType || manualConfirmTypesForStatus(dialog.row?.status)[0] || '');
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
          <MockCallbackLineTable
            lines={lines}
            values={lineShipments}
            onValuesChange={setLineShipments}
            clamp={clampMockLineShip}
            quantityLabel="实出数量"
            disabled={zeroShip}
            onNotify={onNotify}
          />
          <label className="flex items-center gap-2 text-[12px] text-erp-text">
            <input type="checkbox" checked={zeroShip} onChange={(event) => setZeroShip(event.target.checked)} />
            零出（整单按取消结束）
          </label>
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'manual-confirm') {
    const lines = refreshNoticeLines(row.lines || []);
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
                    zeroShip,
                    cancelAgreed: cancelAgreed === 'agree',
                    lineShipments: zeroShip
                      ? []
                      : lines.map((line, index) => clampMockLineShip(lineShipments[index], line.notifyQty)),
                  };
                  const nextRow = applyManualConfirm(row, payload);
                  const message = confirmType === 'accept'
                    ? '已记录人工确认：确认接单'
                    : confirmType === 'cancel_result'
                      ? `已记录人工确认：取消结果（${cancelAgreed === 'agree' ? '仓库同意取消' : '仓库拒绝取消'}）`
                      : zeroShip
                        ? '已记录人工确认：执行结束（整单零出，通知单已取消）'
                        : '已记录人工确认：执行结束（已生成销售出库单）';
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
                  <RadioGroupItem value={value} id={`delivery-notice-confirm-${value}`} aria-label={manualConfirmTypeLabels[value]} />
                  <label htmlFor={`delivery-notice-confirm-${value}`} className="cursor-pointer text-[12px] text-erp-text">
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
                values={lineShipments}
                onValuesChange={setLineShipments}
                clamp={clampMockLineShip}
                quantityLabel="实出数量"
                disabled={zeroShip}
                onNotify={onNotify}
              />
              <label className="flex items-center gap-2 text-[12px] text-erp-text">
                <input type="checkbox" checked={zeroShip} onChange={(event) => setZeroShip(event.target.checked)} />
                零出（整单按取消结束）
              </label>
            </>
          )}
          {confirmType === 'cancel_result' && (
            <div className="space-y-1.5">
              <span className="text-[12px] text-erp-text">仓库取消回复 *（请先与仓库核实）</span>
              <RadioGroup value={cancelAgreed} onValueChange={setCancelAgreed} aria-label="仓库取消回复" className="h-7 gap-4">
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="agree" id="delivery-notice-cancel-agree" aria-label="仓库同意取消" />
                  <label htmlFor="delivery-notice-cancel-agree" className="cursor-pointer text-[12px] text-erp-text">仓库同意取消</label>
                </span>
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="reject" id="delivery-notice-cancel-reject" aria-label="仓库拒绝取消" />
                  <label htmlFor="delivery-notice-cancel-reject" className="cursor-pointer text-[12px] text-erp-text">仓库拒绝取消</label>
                </span>
              </RadioGroup>
            </div>
          )}
          <p className="text-[12px] text-erp-text-muted">
            演示数据：本地Mock补记，不接真实仓库接口。正式流程中确认执行结束生成的结果单走草稿→待审核，原型结果单为只读已审核态，提交后直接生成已审核销售出库单并记账；不替代通知单上事先选择的虚拟出库，也不能无来源新建出库单。
          </p>
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
  // 人工确认：已交给仓库且接口拿不到结果时补记（推送中／待发货／取消中；弹窗与Mock §6）
  if (canManualConfirm(row)) {
    actions.push({ id: 'manual-confirm', label: '人工确认', variant: 'outline' });
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
