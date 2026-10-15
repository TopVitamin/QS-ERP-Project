import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { MockCallbackLineTable } from './MockCallbackLineTable.jsx';
import { getSelectableLogicalWarehouseOptions } from '../../data/warehouseData.js';
import { getSelectableLogisticsProductOptions } from '../../data/logisticsData.js';
import {
  applyApplyCancelShopifyOrder,
  applyApproveShopifyOrder,
  applyBatchShopifyOrderWarehouseAndLogistics,
  applyCancelAuditShopifyOrder,
  applyManualConfirmAccept,
  applyRetryPushShopifyOrder,
  applyRewriteShopifyOrder,
  applyShopifyOrderWarehouseAndLogistics,
  applySubmitShopifyOrder,
  applyWarehouseCancelResultShopifyOrder,
  applyWholeOrderShippedShopifyOrder,
  applyWithdrawShopifyOrder,
  applyZeroExecutionShopifyOrder,
  canApproveShopifyOrder,
  canApplyCancelShopifyOrder,
  canCancelAuditShopifyOrder,
  canCopyShopifyOrder,
  canDeleteShopifyOrder,
  canEditShopifyOrder,
  canManualConfirmShopifyOrder,
  canMockCallbackShopifyOrder,
  canMockPushShopifyOrder,
  canRetryPushShopifyOrder,
  canRewriteShopifyOrder,
  canSubmitShopifyOrder,
  canWithdrawShopifyOrder,
  copyShopifyOrder,
  deleteShopifyOrderById,
  importShopifyOrdersMock,
  pullPaidShopifyOrders,
  refreshShopifyOrderLines,
  scheduleShopifyOrderMockPush,
  shopifyCancelPurposeLabels,
  shopifyWriteBackContentLabels,
} from '../../lib/shopifyOrderLogic.js';

const warehouseOptions = getSelectableLogicalWarehouseOptions();
const logisticsOptions = getSelectableLogisticsProductOptions();

/** 选仓选物流弹窗正文（含批量）。 */
function WarehouseLogisticsFields({ warehouse, logisticsProduct, remark, onWarehouse, onLogistics, onRemark, showRemark = true }) {
  return (
    <div className="mt-3 space-y-3">
      <FormField label="发货仓库" required>
        <SelectField
          options={warehouseOptions}
          value={warehouse}
          onValueChange={onWarehouse}
          placeholder="请选择发货仓库"
          ariaLabel="发货仓库"
        />
      </FormField>
      <FormField label="物流服务产品" required>
        <SelectField
          options={logisticsOptions}
          value={logisticsProduct}
          onValueChange={onLogistics}
          placeholder="请选择物流服务产品"
          ariaLabel="物流服务产品"
        />
      </FormField>
      {showRemark && (
        <FormField label="备注" hint={`${String(remark || '').length}/500`}>
          <Textarea
            value={remark}
            maxLength={500}
            rows={2}
            placeholder="请输入备注"
            aria-label="备注"
            onChange={(event) => onRemark?.(event.target.value)}
          />
        </FormField>
      )}
    </div>
  );
}

/** 取消用途单选（取消审核、申请取消共用）。 */
function CancelPurposeFields({ purpose, reason, onPurpose, onReason, reasonLabel = '取消原因' }) {
  return (
    <>
      <div className="mt-3 space-y-1.5">
        <span className="text-[12px] text-erp-text">取消用途 *</span>
        <RadioGroup value={purpose} onValueChange={onPurpose} aria-label="取消用途" className="h-7 gap-4">
          <span className="flex items-center gap-1.5">
            <RadioGroupItem value="terminate" id="shopify-cancel-purpose-terminate" aria-label={shopifyCancelPurposeLabels.terminate} />
            <label htmlFor="shopify-cancel-purpose-terminate" className="cursor-pointer text-[12px] text-erp-text">{shopifyCancelPurposeLabels.terminate}</label>
          </span>
          <span className="flex items-center gap-1.5">
            <RadioGroupItem value="re_execute" id="shopify-cancel-purpose-reexecute" aria-label={shopifyCancelPurposeLabels.re_execute} />
            <label htmlFor="shopify-cancel-purpose-reexecute" className="cursor-pointer text-[12px] text-erp-text">{shopifyCancelPurposeLabels.re_execute}</label>
          </span>
        </RadioGroup>
      </div>
      <FormField label={reasonLabel} required className="mt-3">
        <Textarea
          value={reason}
          rows={3}
          placeholder={`请输入${reasonLabel}`}
          aria-label={reasonLabel}
          onChange={(event) => onReason(event.target.value)}
        />
      </FormField>
    </>
  );
}

/** 演示开关：仅控制本次 Mock 返回结果，不影响正式规则。 */
function MockSwitch({ checked, onCheckedChange, label, id }) {
  return (
    <label htmlFor={id} className="mt-3 flex cursor-pointer items-center gap-2 text-[12px] text-erp-text">
      <Checkbox id={id} checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} aria-label={label} />
      <span>{label}</span>
    </label>
  );
}

export function SalesShopifyOrderActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [warehouse, setWarehouse] = useState('');
  const [logisticsProduct, setLogisticsProduct] = useState('');
  const [remark, setRemark] = useState('');
  const [returnComment, setReturnComment] = useState('');
  const [reason, setReason] = useState('');
  const [purpose, setPurpose] = useState('terminate');
  const [autoPush, setAutoPush] = useState(true);
  const [shouldFail, setShouldFail] = useState(false);
  const [writeBackFailed, setWriteBackFailed] = useState(false);
  const [zeroExecution, setZeroExecution] = useState(false);
  const [waybillNo, setWaybillNo] = useState('');
  const [lineValues, setLineValues] = useState([]);
  const [cancelResult, setCancelResult] = useState('agree');

  const row = dialog?.row || null;
  const lines = useMemo(() => refreshShopifyOrderLines(row?.lines || []), [row]);

  useEffect(() => {
    if (!dialog) return;
    setWarehouse(dialog.row?.warehouse || (dialog.type === 'batch-edit' ? '' : ''));
    setLogisticsProduct(dialog.row?.logisticsProduct || '');
    setRemark(dialog.row?.remark || '');
    setReturnComment('');
    setReason('');
    setPurpose('terminate');
    setAutoPush(true);
    setShouldFail(false);
    setWriteBackFailed(false);
    setZeroExecution(false);
    setWaybillNo(dialog.row?.waybillNo || '');
    setCancelResult('agree');
    setLineValues(refreshShopifyOrderLines(dialog.row?.lines || []).map((line) => String(line.quantity || 0)));
  }, [dialog]);

  if (!dialog) return null;

  const { type } = dialog;

  function finish(message, typeName = 'success', nextRow, extra = {}) {
    onComplete?.({ message, type: typeName, row: nextRow, ...extra });
    onClose?.();
  }

  function notifyBlock(message) {
    onNotify?.(message, 'warning');
  }

  // —— 选仓选物流（单张 / 批量）——

  if (type === 'edit' || type === 'batch-edit') {
    const isBatch = type === 'batch-edit';
    const batchRows = dialog.rows || [];
    const label = isBatch ? '批量选仓选物流' : `选仓选物流 · ${row.orderNo}`;
    const description = isBatch
      ? `将对已选 ${batchRows.length} 张待提交订单统一设置发货仓库与物流服务产品；不含备注。`
      : '一单一仓、整单履约，提交审核前须选定仓库与物流。';

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={label}
        description={description}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!warehouse || !logisticsProduct}
              onClick={() => {
                if (isBatch) {
                  const rows = applyBatchShopifyOrderWarehouseAndLogistics(batchRows, { warehouse, logisticsProduct });
                  finish(`已更新 ${rows.length} 张订单的发货仓库与物流服务产品`, 'success', null);
                  return;
                }
                const next = applyShopifyOrderWarehouseAndLogistics(row, { warehouse, logisticsProduct, remark });
                finish('独立站订单已保存', 'success', next);
              }}
            >
              保存
            </Button>
          </>
        )}
      >
        <WarehouseLogisticsFields
          warehouse={warehouse}
          logisticsProduct={logisticsProduct}
          remark={remark}
          onWarehouse={setWarehouse}
          onLogistics={setLogisticsProduct}
          onRemark={setRemark}
          showRemark={!isBatch}
        />
      </SimpleDialog>
    );
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交独立站订单？"
        description="提交后进入待审核状态；审核通过后系统自动推送仓库，不需要人工推送。审核前仍可撤回修改。"
        confirmLabel="确认提交"
        onConfirm={() => {
          const block = !row.warehouse ? '请先选定发货仓库' : !row.logisticsProduct ? '请先选定物流服务产品' : null;
          if (block) {
            notifyBlock(block);
            onClose?.();
            return;
          }
          finish('独立站订单已提交', 'success', applySubmitShopifyOrder(row));
        }}
      />
    );
  }

  if (type === 'approve') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核？"
        description="审核后将占用发货仓库库存，订单数量与金额不可再修改；审核通过后系统自动推送仓库。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const result = applyApproveShopifyOrder(row);
                if (result.error) {
                  finish(result.error, 'warning');
                  return;
                }
                if (autoPush) {
                  scheduleShopifyOrderMockPush(result.row.id, { delay: 1000 });
                  finish('独立站订单已审核，已自动推送仓库', 'success', result.row, { followUp: 'push-scheduled' });
                  return;
                }
                finish('独立站订单已审核', 'success', result.row);
              }}
            >
              确认审核
            </Button>
          </>
        )}
      >
        <MockSwitch
          id="shopify-approve-auto-push"
          checked={autoPush}
          onCheckedChange={setAutoPush}
          label="审核后约 1 秒自动模拟推送成功（Demo 开关，默认开）"
        />
      </SimpleDialog>
    );
  }

  if (type === 'withdraw') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="撤回独立站订单"
        description="请填写撤回意见；撤回后回到待提交，可修改后重新提交。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!returnComment.trim()}
              onClick={() => finish('独立站订单已撤回，请修改后重新提交', 'success', applyWithdrawShopifyOrder(row, returnComment.trim()))}
            >
              确认撤回
            </Button>
          </>
        )}
      >
        <Textarea
          value={returnComment}
          rows={4}
          placeholder="请输入撤回意见"
          aria-label="撤回意见"
          className="mt-3"
          onChange={(event) => setReturnComment(event.target.value)}
        />
      </SimpleDialog>
    );
  }

  if (type === 'delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="删除独立站订单？"
        description="删除后记录不可恢复；不向Shopify发起任何操作，如需终止Shopify侧业务请另行处理。"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          deleteShopifyOrderById(row.id);
          onComplete?.({ message: '独立站订单已删除', type: 'success', deleted: true, id: row.id });
          onClose?.();
        }}
      />
    );
  }

  if (type === 'cancel-audit') {
    const needsWarehouseConfirm = row.status === 'push_failed';
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`取消审核 · ${row.orderNo}`}
        description={`取消审核后释放占库。已推送仓库的，须先取得仓库取消成功。${needsWarehouseConfirm ? '请确认仓库尚未接收本单。' : ''}`}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!reason.trim()}
              onClick={() => {
                const result = applyCancelAuditShopifyOrder(row, { purpose, reason: reason.trim() });
                if (result?.error) {
                  finish(result.error, 'warning');
                  return;
                }
                finish(
                  purpose === 'terminate' ? '独立站订单已取消' : '已回到待提交，请修改后重新提交',
                  'success',
                  result.row,
                );
              }}
            >
              确认
            </Button>
          </>
        )}
      >
        <CancelPurposeFields
          purpose={purpose}
          reason={reason}
          onPurpose={setPurpose}
          onReason={setReason}
        />
      </SimpleDialog>
    );
  }

  if (type === 'apply-cancel') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`申请取消 · ${row.orderNo}`}
        description="申请取消后等待仓库回执，不提前释放占库，也不提前向Shopify认定取消成功；仓库拒绝则恢复继续发货。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!reason.trim()}
              onClick={() => finish('已向仓库申请取消，等待回执', 'success', applyApplyCancelShopifyOrder(row, { purpose, reason: reason.trim() }))}
            >
              确认申请
            </Button>
          </>
        )}
      >
        <CancelPurposeFields
          purpose={purpose}
          reason={reason}
          onPurpose={setPurpose}
          onReason={setReason}
        />
      </SimpleDialog>
    );
  }

  if (type === 'retry-push') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="重试推送仓库？"
        description="将按原单重新推送仓库；推送失败不回滚审核与占库。正式环境须已自动重试满 3 次仍失败方可人工重试。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const next = applyRetryPushShopifyOrder(row, { shouldFail });
                finish(shouldFail ? `仍推送失败：${next.pushFailReason}` : '已重新推送仓库', shouldFail ? 'warning' : 'success', next);
              }}
            >
              确认重试
            </Button>
          </>
        )}
      >
        <MockSwitch
          id="shopify-retry-push-fail"
          checked={shouldFail}
          onCheckedChange={setShouldFail}
          label="演示：本次重试仍失败（Mock）"
        />
      </SimpleDialog>
    );
  }

  if (type === 'mock-push') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="模拟推送成功（Mock）"
        description="演示入口：正式流程由系统在审核通过后自动推送，不需要人工推送。确认后模拟推送成功并转待发货。"
        confirmLabel="模拟推送成功"
        onConfirm={() => finish('已重新推送仓库', 'success', applyRetryPushShopifyOrder(row))}
      />
    );
  }

  // —— 执行结束（模拟仓库回传 / 人工确认）——

  const isFinishForm = type === 'mock-callback' && row.status === 'pending_ship';
  const isFinishConfirm = type === 'manual-confirm' && dialog.confirmType === 'finish';

  if (isFinishForm || isFinishConfirm) {
    const allZero = zeroExecution || lineValues.every((value) => Number(value || 0) === 0);
    const quantityMatched = lines.every((line, index) => Number(lineValues[index] || 0) === Number(line.quantity || 0));
    const blocked = !allZero && !quantityMatched;
    const waybillMissing = !allZero && !waybillNo.trim();

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title={isFinishForm ? `模拟仓库回传（Mock）· ${row.orderNo}` : `人工确认 · ${row.orderNo}`}
        description="整单履约：各行实际发货数量须等于订购数量，或整单为0按零执行。演示数据，不代表接口已验证。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={blocked || waybillMissing}
              onClick={() => {
                if (blocked) {
                  notifyBlock('非整单数量：实际发货数量须等于订购数量，或整单为0按零执行');
                  return;
                }
                if (allZero) {
                  const result = applyZeroExecutionShopifyOrder(row, { writeBackFailed, operator: isFinishForm ? '系统' : '当前用户' });
                  if (result?.error) {
                    finish(result.error, 'warning');
                    return;
                  }
                  finish('已按整单零执行取消订单并释放占库', 'success', result.row);
                  return;
                }
                const result = applyWholeOrderShippedShopifyOrder(row, {
                  waybillNo: waybillNo.trim(),
                  writeBackFailed,
                  operator: isFinishForm ? '系统' : '当前用户',
                });
                if (result?.error) {
                  finish(result.error, 'warning');
                  return;
                }
                finish(
                  isFinishForm ? '整单发出，已生成销售出库单并回写Shopify' : '已记录人工确认：执行结束（已生成销售出库单）',
                  'success',
                  result.row,
                );
              }}
            >
              {isFinishForm ? '确认回传' : '确认'}
            </Button>
          </>
        )}
      >
        <MockSwitch
          id="shopify-finish-zero"
          checked={zeroExecution}
          onCheckedChange={setZeroExecution}
          label="整单零执行（各行实发为0，按零出取消）"
        />
        <div className="mt-3">
          <MockCallbackLineTable
            lines={lines}
            values={lineValues}
            onValuesChange={setLineValues}
            limitKey="quantity"
            limitLabel="订购数量"
            quantityLabel="实际发货数量"
            clamp={(value, limit) => Math.min(Number(value || 0), limit)}
            onNotify={notifyBlock}
          />
        </div>
        <div className="mt-3">
          <FormField label="运单号" required={!allZero}>
            <Input
              value={waybillNo}
              placeholder={allZero ? '整单零执行可不填' : '请输入运单号'}
              aria-label="运单号"
              onChange={(event) => setWaybillNo(event.target.value)}
            />
          </FormField>
        </div>
        <MockSwitch
          id="shopify-finish-writeback-fail"
          checked={writeBackFailed}
          onCheckedChange={setWriteBackFailed}
          label="演示：本次回写Shopify失败（Mock）"
        />
      </SimpleDialog>
    );
  }

  // —— 取消结果（模拟仓库回执 / 人工确认）——

  const isCancelResultForm = type === 'mock-cancel-result';
  const isCancelResultConfirm = type === 'manual-confirm' && dialog.confirmType === 'cancel_result';

  if (isCancelResultForm || isCancelResultConfirm) {
    const isReExecute = row.cancelPurpose === 're_execute';
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={isCancelResultForm ? `模拟仓库回执（Mock）· ${row.orderNo}` : `人工确认 · ${row.orderNo}`}
        description="仓库同意取消：终止订单落已取消、调整后重新执行回到待提交；仓库拒绝则恢复待发货继续发货。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const agree = cancelResult === 'agree';
                const result = applyWarehouseCancelResultShopifyOrder(row, {
                  agree,
                  writeBackFailed,
                  operator: isCancelResultForm ? '系统' : '当前用户',
                });
                if (result?.error) {
                  finish(result.error, 'warning');
                  return;
                }
                if (!agree) {
                  finish('仓库拒绝取消，已恢复待发货继续执行', 'success', result.row);
                  return;
                }
                finish(
                  isReExecute ? '仓库同意取消，已回到待提交' : '仓库同意取消，订单已取消',
                  'success',
                  result.row,
                );
              }}
            >
              {isCancelResultForm ? '确认回执' : '确认'}
            </Button>
          </>
        )}
      >
        <div className="space-y-1.5">
          <span className="text-[12px] text-erp-text">仓库结果 *</span>
          <RadioGroup value={cancelResult} onValueChange={setCancelResult} aria-label="仓库结果" className="h-7 gap-4">
            <span className="flex items-center gap-1.5">
              <RadioGroupItem value="agree" id="shopify-cancel-agree" aria-label="仓库同意取消" />
              <label htmlFor="shopify-cancel-agree" className="cursor-pointer text-[12px] text-erp-text">仓库同意取消</label>
            </span>
            <span className="flex items-center gap-1.5">
              <RadioGroupItem value="reject" id="shopify-cancel-reject" aria-label="仓库拒绝取消" />
              <label htmlFor="shopify-cancel-reject" className="cursor-pointer text-[12px] text-erp-text">仓库拒绝取消</label>
            </span>
          </RadioGroup>
        </div>
        {cancelResult === 'agree' && !isReExecute && (
          <MockSwitch
            id="shopify-cancel-writeback-fail"
            checked={writeBackFailed}
            onCheckedChange={setWriteBackFailed}
            label="演示：本次回写Shopify失败（Mock）"
          />
        )}
      </SimpleDialog>
    );
  }

  if (type === 'manual-confirm' && dialog.confirmType === 'accept') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`人工确认 · ${row.orderNo}`}
        description="用于已交给仓库、接口拿不到结果的场景；确认接单视同仓库已接收，转待发货，不生成结果单。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => finish('已记录人工确认：确认接单', 'success', applyManualConfirmAccept(row))}
            >
              确认
            </Button>
          </>
        )}
      >
        <p className="text-[12px] text-erp-text-muted">独立站订单（演示数据）：确认后状态转为待发货，推送与回写记录保留。</p>
      </SimpleDialog>
    );
  }

  if (type === 'copy') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`复制新单 · ${row.orderNo}`}
        description={`将按原单商品、数量、金额与收货信息生成一张新草稿，仍挂同一个Shopify来源单号（${row.shopifyOrderNo}），需重新选仓选物流。原单保持已取消，不复活。`}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const next = copyShopifyOrder(row);
                finish(`已复制新单 ${next.orderNo}，请重新选仓选物流`, 'success', row, { followUp: 'open-copy', newOrderId: next.id, newOrderNo: next.orderNo });
              }}
            >
              确认复制
            </Button>
          </>
        )}
      />
    );
  }

  if (type === 'rewrite') {
    const content = row.writeBackContent || (row.status === 'cancelled' ? 'cancel' : 'shipment');
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title={`重新回写 · ${row.orderNo}`}
        description={`将重新向Shopify回写${shopifyWriteBackContentLabels[content] || content}；回写失败不回滚ERP业务与库存。`}
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const result = applyRewriteShopifyOrder(row, { shouldFail });
                if (result?.error) {
                  finish(result.error, 'warning');
                  return;
                }
                finish(shouldFail ? '仍回写失败，请稍后重试' : '已重新回写Shopify', shouldFail ? 'warning' : 'success', result.row);
              }}
            >
              确认
            </Button>
          </>
        )}
      >
        <MockSwitch
          id="shopify-rewrite-fail"
          checked={shouldFail}
          onCheckedChange={setShouldFail}
          label="演示：本次仍失败（Mock）"
        />
      </SimpleDialog>
    );
  }

  if (type === 'pull-orders') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="拉取已付款订单（Mock）"
        description="自研接口仅拉取Shopify已付款订单；按「来源系统＋来源单号」识别，重复拉取不重复建单。演示将返回 3 张订单（含 1 张重复单号）。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const result = pullPaidShopifyOrders({ loadSeed: dialog.loadSeed });
                const skipped = result.skipped.length;
                const message = `演示拉取完成：新增 ${result.created.length} 张待提交订单${skipped ? `，跳过 ${skipped} 张重复单号（${result.skipped.join('、')}）` : ''}`;
                finish(message, 'success', null);
              }}
            >
              确认拉取
            </Button>
          </>
        )}
      >
        <p className="text-[12px] text-erp-text-muted">演示数据：不调用真实接口，生成的订单为待提交草稿，需选仓选物流后提交审核。</p>
      </SimpleDialog>
    );
  }

  if (type === 'import-orders') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="导入独立站订单（Mock）"
        description="仅用于接口未覆盖的Shopify订单，导入后仍需提交审核。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const result = importShopifyOrdersMock({ loadSeed: dialog.loadSeed });
                finish(`演示导入完成：生成 ${result.created.length} 张待提交草稿，请检查后提交审核`, 'success', null);
              }}
            >
              确认导入
            </Button>
          </>
        )}
      >
        <ol className="space-y-1 text-[12px] text-erp-text">
          <li>1 下载模板（Mock）</li>
          <li>2 上传文件（.xlsx，Mock）</li>
          <li>3 校验预览：按Shopify来源单号分组，任一行失败整组不导入</li>
          <li>4 导入：生成待提交草稿（获取方式=人工导入）</li>
        </ol>
        <p className="mt-2 text-[12px] text-erp-text-muted">演示数据：不创建导入任务文件、不写入真实数据；重复来源单号按识别规则处理。</p>
      </SimpleDialog>
    );
  }

  return null;
}

/** 详情页头操作：按状态互斥展示（主 PRD §6.4；返回列表由框架渲染在最前）。 */
export function SalesShopifyOrderDetailHeaderActions({ row, onAction }) {
  if (!row) return null;
  const actions = [];

  if (canEditShopifyOrder(row)) {
    actions.push({ id: 'edit', label: '编辑', variant: 'primary' });
  }
  if (canSubmitShopifyOrder(row)) {
    actions.push({ id: 'submit', label: '提交', variant: 'primary' });
  }
  if (canDeleteShopifyOrder(row)) {
    actions.push({ id: 'delete', label: '删除', variant: 'outline' });
  }
  if (canApproveShopifyOrder(row)) {
    actions.push({ id: 'approve', label: '审核', variant: 'primary' });
  }
  if (canWithdrawShopifyOrder(row)) {
    actions.push({ id: 'withdraw', label: '撤回', variant: 'outline' });
  }
  if (canCancelAuditShopifyOrder(row)) {
    actions.push({ id: 'cancel-audit', label: '取消审核', variant: 'outline' });
  }
  if (canMockPushShopifyOrder(row)) {
    actions.push({ id: 'mock-push', label: '模拟推送成功（Mock）', variant: 'outline' });
  }
  if (canRetryPushShopifyOrder(row)) {
    actions.push({ id: 'retry-push', label: '重试推送', variant: 'outline' });
  }
  if (canApplyCancelShopifyOrder(row)) {
    actions.push({ id: 'apply-cancel', label: '申请取消', variant: 'outline' });
  }
  if (canMockCallbackShopifyOrder(row)) {
    actions.push({
      id: 'mock-callback',
      label: row.status === 'cancelling' ? '模拟仓库回执（Mock）' : '模拟仓库回传（Mock）',
      variant: 'outline',
    });
  }
  if (canManualConfirmShopifyOrder(row)) {
    actions.push({ id: 'manual-confirm', label: '人工确认', variant: 'outline' });
  }
  if (canCopyShopifyOrder(row)) {
    actions.push({ id: 'copy', label: '复制新单', variant: 'outline' });
  }
  if (canRewriteShopifyOrder(row)) {
    actions.push({ id: 'rewrite', label: '重新回写', variant: 'outline' });
  }

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
