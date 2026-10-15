import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { MockCallbackLineTable } from './MockCallbackLineTable.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import {
  applyApproveRequest,
  applyCancelRequest,
  applyManualConfirmRequest,
  applyMockDeliveryRequest,
  applyRetryPushRequest,
  applySubmitRequest,
  applyWarehouseCancelResult,
  applyWithdrawRequest,
  canApproveRequest,
  canCancelRequest,
  canDeleteRequest,
  canManualConfirmRequest,
  canMockDeliveryRequest,
  canMockWarehouseCancelReply,
  canRetryPushRequest,
  canSubmitRequest,
  canWithdrawRequest,
  deleteOtherOutboundRequest,
  isTransitDirectPostingRequest,
  manualConfirmTypeLabels,
  otherOutboundRequestStatusLabels,
  refreshOutboundRequestLines,
  resolveManualConfirmType,
} from '../../lib/otherOutboundRequestLogic.js';

const confirmTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const confirmHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const confirmThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const confirmRowClassName = 'h-8 border-b border-erp-border-table-row';
const confirmTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

function clampMockActual(value, requested) {
  const max = Number(requested || 0);
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(Math.floor(num), max);
}

/**
 * 其他出库申请单的模块弹窗：提交、审核（含在途仓直接记账确认）、撤回、取消、重试推送、删除草稿、Demo Mock 回传与仓库回执。
 * 标题、正文与按钮文案按《其他出库申请单前端Demo版PRD_弹窗与Mock》§3、§5；条件不满足时不展示入口，不靠弹窗阻断。
 */
export function OtherOutboundRequestActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [withdrawComment, setWithdrawComment] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [lineActuals, setLineActuals] = useState([]);
  const [zeroOut, setZeroOut] = useState(false);
  const [cancelResult, setCancelResult] = useState('agree');

  useEffect(() => {
    if (!dialog) return;
    setWithdrawComment('');
    setCancelReason('');
    setFieldError('');
    setZeroOut(false);
    setCancelResult('agree');
    const lines = refreshOutboundRequestLines(dialog.row?.lines || []);
    setLineActuals(lines.map((line) => String(line.quantity || 0)));
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', extra = {}) {
    onComplete?.({ message, type: typeName, row, ...extra });
    onClose?.();
  }

  function finishWithError(error) {
    onNotify?.(error.message, 'warning');
    onClose?.();
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交其他出库申请单？"
        description="提交后进入待审核状态，出库仓、业务类型与数量不可再修改；审核通过时按可用库存预占，可用不足不能审核；审核前仍可撤回修改。"
        confirmLabel="确认提交"
        onConfirm={() => {
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          try {
            finish('其他出库申请单已提交', 'success', { row: applySubmitRequest(row) });
          } catch (error) {
            finishWithError(error);
          }
        }}
      />
    );
  }

  if (type === 'approve') {
    if (isTransitDirectPostingRequest(row)) {
      return (
        <ConfirmDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="确认按在途仓直接记账？"
          description="本单用于处理分步式调拨少收差异，不推送仓库，审核通过后由系统按申请数量直接生成其他出库单并记账。"
          confirmLabel="确认"
          onConfirm={() => {
            try {
              finish('审核通过，已按在途仓直接记账', 'success', { row: applyApproveRequest(row) });
            } catch (error) {
              finishWithError(error);
            }
          }}
        />
      );
    }

    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核其他出库申请单？"
        description="审核通过后按可用库存预占，系统自动推送仓库；实际出库以仓库回传的结果单为准，实出消耗预占、未出释放。"
        confirmLabel="确认审核"
        onConfirm={() => {
          try {
            finish('审核通过，正在推送仓库', 'success', { row: applyApproveRequest(row) });
          } catch (error) {
            finishWithError(error);
          }
        }}
      />
    );
  }

  if (type === 'withdraw') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="撤回其他出库申请单"
        description="撤回后回到草稿，可修改后重新提交；撤回意见会保留。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                if (!withdrawComment.trim()) {
                  setFieldError('撤回意见不能为空');
                  return;
                }
                try {
                  finish('已撤回', 'success', { row: applyWithdrawRequest(row, withdrawComment.trim()) });
                } catch (error) {
                  finishWithError(error);
                }
              }}
            >
              确认撤回
            </Button>
          </>
        )}
      >
        <div className="mt-3 space-y-1">
          <div className="text-[12px] text-erp-text">撤回意见 *</div>
          <Textarea
            value={withdrawComment}
            onChange={(event) => {
              setWithdrawComment(event.target.value);
              if (fieldError) setFieldError('');
            }}
            placeholder="请输入撤回意见"
            rows={3}
          />
          {fieldError ? <div className="text-[12px] text-erp-danger">{fieldError}</div> : null}
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'cancel') {
    const isApplyCancel = row.status === 'pending_delivery';
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="取消其他出库申请单"
        description="取消后本单不再执行，不可撤销；未执行部分的预占在取消成功后释放。已推送给仓库的，需等待仓库确认取消或实际结果，不能单方面认定。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                if (!cancelReason.trim()) {
                  setFieldError('取消原因不能为空');
                  return;
                }
                try {
                  const next = applyCancelRequest(row, cancelReason.trim());
                  finish(isApplyCancel ? '已申请取消，等待仓库确认' : '已取消', 'success', { row: next });
                } catch (error) {
                  finishWithError(error);
                }
              }}
            >
              确认取消
            </Button>
          </>
        )}
      >
        <div className="mt-3 space-y-1">
          <div className="text-[12px] text-erp-text">取消原因 *</div>
          <Textarea
            value={cancelReason}
            onChange={(event) => {
              setCancelReason(event.target.value);
              if (fieldError) setFieldError('');
            }}
            placeholder="请输入取消原因"
            rows={3}
          />
          {fieldError ? <div className="text-[12px] text-erp-danger">{fieldError}</div> : null}
        </div>
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
          try {
            finish('已重新推送，等待仓库接收', 'success', { row: applyRetryPushRequest(row) });
          } catch (error) {
            finishWithError(error);
          }
        }}
      />
    );
  }

  if (type === 'delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="删除其他出库申请单草稿"
        description="删除后不可恢复，确定删除该草稿？"
        confirmLabel="确认删除"
        onConfirm={() => {
          deleteOtherOutboundRequest(row.id);
          finish('草稿已删除', 'success', { deleted: true });
        }}
      />
    );
  }

  if (type === 'manual-confirm') {
    const confirmType = resolveManualConfirmType(row);

    if (!confirmType) {
      // 状态已变化：不进入成功流，按主PRD §6.4 阻断提示
      return (
        <SimpleDialog
          open
          onOpenChange={(open) => { if (!open) onClose?.(); }}
          title="人工确认（补记仓库实际结果）"
          description={`当前单据状态为${otherOutboundRequestStatusLabels[row?.status] || row?.status || '-'}，不可执行人工确认`}
          footer={<Button variant="primary" size="compact" onClick={onClose}>关闭</Button>}
        />
      );
    }

    const lines = refreshOutboundRequestLines(row.lines || []);
    const statusLabel = otherOutboundRequestStatusLabels[row?.status] || '';
    const typeLabel = `${manualConfirmTypeLabels[confirmType]}（${statusLabel}）`;
    const isFinish = confirmType === 'finish';

    function handleManualConfirm() {
      try {
        const next = applyManualConfirmRequest(row, {
          confirmType,
          zeroOut,
          lineActuals,
          cancelResult,
        });
        const message = confirmType === 'finish'
          ? (zeroOut
            ? '已记录人工确认结果：零出（整单按取消结束）'
            : '已记录人工确认结果：执行结束（已形成演示用其他出库单，待审核）')
          : confirmType === 'accept'
            ? '已记录人工确认结果：确认接单'
            : (cancelResult === 'agree'
              ? '已记录人工确认结果：仓库同意取消'
              : '已记录人工确认结果：仓库拒绝取消，恢复等待实际结果');
        finish(message, 'success', { row: next });
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
        description="只用于已交给仓库、接口拿不到结果的申请；确认前请先与仓库核实实际结果。"
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
              <RadioGroupItem value={confirmType} id="other-outbound-request-manual-confirm-type" aria-label={typeLabel} />
              <label htmlFor="other-outbound-request-manual-confirm-type" className="cursor-pointer text-[12px] text-erp-text">{typeLabel}</label>
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
                    <th className={cn(confirmThClassName, 'text-right')}>申请出库数量</th>
                    <th className={cn(confirmThClassName, 'text-right')}>实出数量</th>
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
                          aria-label={`第${index + 1}行实出数量`}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[12px] text-erp-text">
              <input type="checkbox" checked={zeroOut} onChange={(event) => setZeroOut(event.target.checked)} />
              零出（整单按取消结束，不生成其他出库单）
            </label>
            <p className="mt-3 text-[12px] text-erp-text-muted">
              演示说明：确认执行结束且实出&gt;0 时形成演示用其他出库单（待审核，演示数据）；审核通过后才扣减即时库存、消耗实出预占、释放未出预占并推送财务ERP，原型不提供该结果单的审核入口。
            </p>
          </>
        )}

        {confirmType === 'cancel_result' && (
          <>
            <div className="mt-3 space-y-1.5">
              <span className="text-[12px] text-erp-text">取消结果 *</span>
              <RadioGroup value={cancelResult} onValueChange={setCancelResult} aria-label="取消结果" className="h-7 gap-4">
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="agree" id="other-outbound-request-cancel-agree" aria-label="仓库同意取消" />
                  <label htmlFor="other-outbound-request-cancel-agree" className="cursor-pointer text-[12px] text-erp-text">仓库同意取消</label>
                </span>
                <span className="flex items-center gap-1.5">
                  <RadioGroupItem value="reject" id="other-outbound-request-cancel-reject" aria-label="仓库拒绝取消" />
                  <label htmlFor="other-outbound-request-cancel-reject" className="cursor-pointer text-[12px] text-erp-text">仓库拒绝取消</label>
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
            确认接单视同仓库已接收本申请，转待发货；预占保持占用、不生成结果单。
          </p>
        )}
      </SimpleDialog>
    );
  }

  if (type === 'mock-delivery') {
    const lines = refreshOutboundRequestLines(row.lines || []);

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟仓库回传（Demo）"
        description="按实际出库数量生成演示用其他出库单；正式流程以仓库回传为准。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const actuals = zeroOut
                  ? lines.map(() => 0)
                  : lines.map((line, index) => clampMockActual(lineActuals[index], line.quantity));
                const total = actuals.reduce((sum, value) => sum + value, 0);
                if (!zeroOut && total <= 0) {
                  onNotify?.('请填写实出数量，或勾选零出', 'warning');
                  return;
                }
                try {
                  const result = applyMockDeliveryRequest(row, { lineActuals: actuals });
                  if (!result.outbound) {
                    finish('仓库零出，其他出库申请单已取消并释放预占', 'success', { row: result.request });
                    return;
                  }
                  const shortQty = (result.request.totalRemainingQty ?? 0);
                  finish(
                    shortQty > 0
                      ? `仓库回传已确认，已生成其他出库单，缺量 ${shortQty} 已释放预占`
                      : '仓库回传已确认，其他出库单已生成',
                    'success',
                    { row: result.request, outbound: result.outbound },
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
        <div className="mt-3 space-y-3">
          <MockCallbackLineTable
            lines={lines}
            values={lineActuals}
            onValuesChange={setLineActuals}
            clamp={clampMockActual}
            limitKey="quantity"
            limitLabel="申请出库数量"
            quantityLabel="实出数量"
            limitExceededMessage="实出数量不能超过申请数量，已自动调整为申请数量"
            disabled={zeroOut}
            showBarcode={false}
            showUnit
            onNotify={onNotify}
          />
          <label className="flex items-center gap-2 text-[12px] text-erp-text">
            <input type="checkbox" checked={zeroOut} onChange={(event) => setZeroOut(event.target.checked)} />
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
        description="取消中收到仓库回执：仓库同意→已取消并释放未执行预占；仓库拒绝→恢复待发货，预占继续占用。"
        footer={(
          <>
            <Button
              variant="outline"
              size="compact"
              onClick={() => {
                try {
                  finish('仓库拒绝取消，已恢复待发货', 'info', { row: applyWarehouseCancelResult(row, false) });
                } catch (error) {
                  finishWithError(error);
                }
              }}
            >
              仓库拒绝
            </Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  finish('已取消', 'success', { row: applyWarehouseCancelResult(row, true) });
                } catch (error) {
                  finishWithError(error);
                }
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

/** 详情页头操作：`返回列表` 之后按状态互斥展示，顺序与《其他出库申请单前端Demo版PRD_详情页》§2 一致。 */
export function OtherOutboundRequestDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];
  if (canSubmitRequest(row)) actions.push({ id: 'submit', label: '提交' });
  if (canDeleteRequest(row)) actions.push({ id: 'delete', label: '删除' });
  if (canApproveRequest(row)) actions.push({ id: 'approve', label: '审核' });
  if (canWithdrawRequest(row)) actions.push({ id: 'withdraw', label: '撤回' });
  if (canRetryPushRequest(row)) actions.push({ id: 'retry', label: '重试推送' });
  if (canManualConfirmRequest(row)) actions.push({ id: 'manual-confirm', label: '人工确认' });
  if (canCancelRequest(row)) actions.push({ id: 'cancel', label: '取消' });
  if (canMockDeliveryRequest(row)) actions.push({ id: 'mock-delivery', label: '模拟仓库回传' });
  if (canMockWarehouseCancelReply(row)) actions.push({ id: 'warehouse-cancel-demo', label: '模拟仓库回执' });

  return actions.map((action) => (
    <Button key={action.id} variant="outline" size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
