import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { Textarea } from '../ui/textarea.jsx';
import { cn } from '../../lib/utils.js';
import { REMARK_500_MAX } from '../../data/inventoryStockData.js';
import { productOptions } from '../../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../../data/warehouseData.js';
import {
  applyApproveDirectTransfer,
  applyDeleteDirectTransfer,
  applySubmitDirectTransfer,
  applyWithdrawDirectTransfer,
  canApproveDirectTransfer,
  canDeleteDirectTransfer,
  canSubmitDirectTransfer,
  canWithdrawDirectTransfer,
  createDirectTransferFromWarehouseCallback,
  validateDirectTransferWarehouses,
} from '../../lib/directTransferLogic.js';

const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const theadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row';
const tdClassName = 'border-r border-erp-border-table-column align-middle last:border-r-0';

function createCallbackLine() {
  return { id: `callback-line-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`, product: '', quantity: '' };
}

const warehouseOptions = getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: false });

/**
 * 直接调拨单模块弹窗：提交、撤回、删除草稿、审核、仓库主动回传 Mock。
 * 标题、正文与失败文案见《直接调拨单前端Demo版PRD_弹窗与Mock》§2、§4。
 */
export function DirectTransferActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [comment, setComment] = useState('');
  const [callbackForm, setCallbackForm] = useState({
    fromWarehouse: '',
    toWarehouse: '',
    sourceSystem: '领星',
    sourceNo: '',
    lines: [createCallbackLine()],
  });

  useEffect(() => {
    if (!dialog) return;
    setComment('');
    setCallbackForm({
      fromWarehouse: '',
      toWarehouse: '',
      sourceSystem: '领星',
      sourceNo: '',
      lines: [createCallbackLine()],
    });
  }, [dialog]);

  if (!dialog) return null;

  const { type, row } = dialog;

  function finish(message, typeName = 'success', nextRow) {
    onComplete?.({ message, type: typeName, row: nextRow });
    onClose?.();
  }

  if (type === 'submit') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认提交直接调拨单？"
        description="提交后进入待审核状态，来源逻辑仓、目标逻辑仓与数量不可再修改；审核通过后来源仓减少、目标仓增加并推送财务ERP，不推送仓库、不涉及预占。"
        confirmLabel="确认提交"
        onConfirm={() => {
          // 新增/编辑页先保存再提交：由页面传入 onConfirm
          if (dialog.onConfirm) {
            dialog.onConfirm();
            onClose?.();
            return;
          }
          finish('已提交，等待审核', 'success', applySubmitDirectTransfer(row));
        }}
      />
    );
  }

  if (type === 'withdraw') {
    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="撤回直接调拨单"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              disabled={!comment.trim()}
              onClick={() => finish('已撤回，单据回到草稿', 'success', applyWithdrawDirectTransfer(row, comment.trim()))}
            >
              确认撤回
            </Button>
          </>
        )}
      >
        <div className="mt-3">
          <FormField label="撤回意见 *">
            <Textarea
              rows={3}
              maxLength={REMARK_500_MAX}
              value={comment}
              placeholder="请输入撤回意见"
              aria-label="撤回意见"
              onChange={(event) => setComment(event.target.value)}
            />
          </FormField>
        </div>
      </SimpleDialog>
    );
  }

  if (type === 'delete') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="删除直接调拨单草稿"
        description="删除后不可恢复，确定删除该草稿？"
        confirmLabel="确认删除"
        confirmVariant="danger"
        onConfirm={() => {
          applyDeleteDirectTransfer(row);
          finish('草稿已删除', 'success', null);
        }}
      />
    );
  }

  if (type === 'approve') {
    return (
      <ConfirmDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        title="确认审核直接调拨单？"
        description="审核通过后来源逻辑仓即时库存减少、目标逻辑仓增加，并生成库存流水、推送财务ERP。可用库存不足时不能审核，不允许负库存。"
        confirmLabel="确认审核"
        onConfirm={() => {
          try {
            const next = applyApproveDirectTransfer(row);
            finish('审核通过，库存已生效并推送财务ERP', 'success', next);
          } catch (error) {
            onNotify?.(error.message || '审核失败，请稍后重试', 'warning');
          }
        }}
      />
    );
  }

  if (type === 'mock-callback') {
    const updateLine = (lineId, key, value) => {
      setCallbackForm((current) => ({
        ...current,
        lines: current.lines.map((line) => (line.id === lineId ? { ...line, [key]: value } : line)),
      }));
    };

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟回传生成（Demo）"
        description="按仓库已完成的实际调整生成演示用已审核直接调拨单；正式流程以仓库回传为准，不补建申请单、不补做预占。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                const warehouseError = validateDirectTransferWarehouses(callbackForm.fromWarehouse, callbackForm.toWarehouse);
                if (warehouseError) {
                  onNotify?.('归属依据不足，无法确定记入逻辑仓，未生成直接调拨单', 'warning');
                  return;
                }
                try {
                  const next = createDirectTransferFromWarehouseCallback(callbackForm);
                  finish(`已生成仓库主动回传直接调拨单 ${next.transferNo}`, 'success', next);
                } catch (error) {
                  onNotify?.(error.message || '生成失败，请稍后重试', 'warning');
                }
              }}
            >
              确认生成
            </Button>
          </>
        )}
      >
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FormField label="来源类型 *">
            <Input value="仓库主动回传" disabled aria-label="来源类型" />
          </FormField>
          <FormField label="来源系统">
            <Input
              value={callbackForm.sourceSystem}
              placeholder="请输入来源系统"
              aria-label="来源系统"
              onChange={(event) => setCallbackForm((current) => ({ ...current, sourceSystem: event.target.value }))}
            />
          </FormField>
          <FormField label="来源逻辑仓 *">
            <SelectField
              options={warehouseOptions}
              value={callbackForm.fromWarehouse}
              onValueChange={(value) => setCallbackForm((current) => ({ ...current, fromWarehouse: value }))}
              placeholder="请选择来源逻辑仓"
              ariaLabel="来源逻辑仓"
            />
          </FormField>
          <FormField label="目标逻辑仓 *">
            <SelectField
              options={warehouseOptions}
              value={callbackForm.toWarehouse}
              onValueChange={(value) => setCallbackForm((current) => ({ ...current, toWarehouse: value }))}
              placeholder="请选择目标逻辑仓"
              ariaLabel="目标逻辑仓"
            />
          </FormField>
          <FormField label="来源单号">
            <Input
              value={callbackForm.sourceNo}
              placeholder="请输入来源单号"
              aria-label="来源单号"
              onChange={(event) => setCallbackForm((current) => ({ ...current, sourceNo: event.target.value }))}
            />
          </FormField>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-erp-text">商品与数量</span>
          <Button
            variant="outline"
            size="compact"
            onClick={() => setCallbackForm((current) => ({ ...current, lines: [...current.lines, createCallbackLine()] }))}
          >
            添加明细
          </Button>
        </div>
        <div className="mt-2 table-scroll overflow-x-auto">
          <table className={tableClassName} style={{ minWidth: '520px' }}>
            <colgroup>
              <col className="w-10" />
              <col className="w-[220px]" />
              <col className="w-[130px]" />
              <col className="w-[72px]" />
            </colgroup>
            <thead className={theadClassName}>
              <tr>
                <th className={thClassName}>行号</th>
                <th className={thClassName}>商品 *</th>
                <th className={cn(thClassName, 'text-right')}>实际调拨数量 *</th>
                <th className={cn(thClassName, 'text-center')}>操作</th>
              </tr>
            </thead>
            <tbody>
              {callbackForm.lines.map((line, index) => (
                <tr key={line.id} className={rowClassName}>
                  <td className={cn(tdClassName, 'px-2 text-erp-text-muted')}>{index + 1}</td>
                  <td className={cn(tdClassName, 'px-1.5')}>
                    <SelectField
                      options={productOptions}
                      value={line.product}
                      onValueChange={(value) => updateLine(line.id, 'product', value)}
                      placeholder="请选择商品"
                      ariaLabel={`第${index + 1}行商品`}
                      variant="boxed"
                    />
                  </td>
                  <td className={cn(tdClassName, 'px-1.5')}>
                    <Input
                      variant="boxed"
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      className="text-right"
                      aria-label={`第${index + 1}行实际调拨数量`}
                      onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                    />
                  </td>
                  <td className={cn(tdClassName, 'px-1.5 text-center')}>
                    <Button
                      variant="danger"
                      size="icon"
                      aria-label={`删除第${index + 1}行`}
                      title="删除明细"
                      onClick={() => setCallbackForm((current) => ({
                        ...current,
                        lines: current.lines.length <= 1 ? current.lines : current.lines.filter((item) => item.id !== line.id),
                      }))}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-erp-text-muted">
          按回传仓对一减一增记账，不补做预占；来源仓可用量不足时阻断并提示「库存不足，不允许负库存」。
          Mock 仅用于演示，不代表正式接口。
        </p>
      </SimpleDialog>
    );
  }

  return null;
}

/**
 * 直接调拨单详情页头操作：返回列表之后按状态互斥展示（主PRD §6.4）。
 * 自动生成的结果单（分步式两端、仓库主动回传）不展示提交、删除、审核、撤回；
 * 财务ERP重推入口在系统集成中心，本页不提供。
 */
export function DirectTransferDetailHeaderActions({ row, onAction }) {
  if (!row) return null;

  const actions = [];
  if (canSubmitDirectTransfer(row)) actions.push({ id: 'submit', label: '提交', variant: 'outline' });
  if (canDeleteDirectTransfer(row)) actions.push({ id: 'delete', label: '删除', variant: 'outline' });
  if (canApproveDirectTransfer(row)) actions.push({ id: 'approve', label: '审核', variant: 'primary' });
  if (canWithdrawDirectTransfer(row)) actions.push({ id: 'withdraw', label: '撤回', variant: 'outline' });

  return actions.map((action) => (
    <Button key={action.id} variant={action.variant} size="compact" onClick={() => onAction(action.id, row)}>
      {action.label}
    </Button>
  ));
}
