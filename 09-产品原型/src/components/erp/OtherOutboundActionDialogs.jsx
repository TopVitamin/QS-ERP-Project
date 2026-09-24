import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { productOptions, skuOptions } from '../../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../../data/warehouseData.js';
import { createOtherOutboundLine, createMockWarehouseOutbound } from '../../lib/otherOutboundLogic.js';
import { otherOutboundBusinessTypeOptions } from '../../lib/otherOutboundRequestLogic.js';

const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const headClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row';
const tdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

function createMockLine() {
  return { ...createOtherOutboundLine(), quantity: '' };
}

function today() {
  return new Date().toISOString().slice(0, 10).replaceAll('-', '');
}

/**
 * 其他出库单的模块弹窗：仅 Demo 的仓库主动回传（弹窗与Mock §3）。
 * 本模块列表/详情不提供新增、编辑、取消、作废与重推财务ERP入口。
 */
export function OtherOutboundActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (dialog?.type !== 'mock-warehouse-outbound') {
      setForm(null);
      return;
    }
    setForm({
      logicalWarehouse: '',
      businessType: '',
      sourceSystem: 'WMS',
      sourceNo: `WMS-${today()}-0001`,
      remark: '',
      lines: [createMockLine()],
    });
  }, [dialog]);

  if (!dialog) return null;

  if (dialog.type !== 'mock-warehouse-outbound' || !form) return null;

  function updateLine(lineId, key, value) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId ? { ...line, [key]: value } : line)),
    }));
  }

  function selectProduct(lineId, product) {
    const sku = skuOptions.find((item) => item.value === product) || {};
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line) => (line.id === lineId
        ? {
          ...line,
          product,
          productCode: sku.skuCode || '',
          productName: sku.productName || '',
          unit: sku.unit || line.unit || '个',
        }
        : line)),
    }));
  }

  return (
    <SimpleDialog
      open
      onOpenChange={(open) => { if (!open) onClose?.(); }}
      size="xl"
      title="模拟仓库主动回传（Demo）"
      description="按仓库已完成的实际变动生成演示用已审核出库单；正式流程以仓库回传为准，不补建申请单、不补做预占。"
      footer={(
        <>
          <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
          <Button
            variant="primary"
            size="compact"
            onClick={() => {
              try {
                const outbound = createMockWarehouseOutbound(form);
                onComplete?.({
                  message: `已生成演示用其他出库单 ${outbound.outboundNo}（Mock）`,
                  type: 'success',
                  row: outbound,
                });
                onClose?.();
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
      <div className="mt-3 space-y-3">
        <div className="grid grid-cols-2 gap-x-5 gap-y-3">
          <FormField label="出库仓库 *" fieldKey="mock-logical-warehouse">
            <SelectField
              options={getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: true })}
              value={form.logicalWarehouse}
              onValueChange={(value) => setForm((current) => ({ ...current, logicalWarehouse: value }))}
              placeholder="请选择出库仓库"
              ariaLabel="出库仓库"
            />
          </FormField>
          <FormField label="业务类型 *" fieldKey="mock-business-type">
            <SelectField
              options={otherOutboundBusinessTypeOptions}
              value={form.businessType}
              onValueChange={(value) => setForm((current) => ({ ...current, businessType: value }))}
              placeholder="请选择业务类型"
              ariaLabel="业务类型"
            />
          </FormField>
          <FormField label="来源系统 *" fieldKey="mock-source-system">
            <Input
              value={form.sourceSystem}
              onChange={(event) => setForm((current) => ({ ...current, sourceSystem: event.target.value }))}
              placeholder="请输入来源系统"
              aria-label="来源系统"
            />
          </FormField>
          <FormField label="来源单号 *" fieldKey="mock-source-no">
            <Input
              value={form.sourceNo}
              onChange={(event) => setForm((current) => ({ ...current, sourceNo: event.target.value }))}
              placeholder="请输入来源单号"
              aria-label="来源单号"
            />
          </FormField>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[12px] text-erp-text">商品与数量 *</div>
            <Button
              variant="outline"
              size="compact"
              onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, createMockLine()] }))}
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
              添加明细
            </Button>
          </div>
          <div className="table-scroll overflow-x-auto">
            <table className={tableClassName} style={{ minWidth: '640px' }}>
              <colgroup>
                <col className="w-10" />
                <col className="w-[200px]" />
                <col className="w-[108px]" />
                <col className="w-[64px]" />
                <col className="w-[112px]" />
                <col className="w-[64px]" />
              </colgroup>
              <thead className={headClassName}>
                <tr>
                  <th className={thClassName}>行号</th>
                  <th className={thClassName}>商品 *</th>
                  <th className={thClassName}>商品编码</th>
                  <th className={thClassName}>基本单位</th>
                  <th className={cn(thClassName, 'text-right')}>实际出库数量 *</th>
                  <th className={cn(thClassName, 'text-center')}>操作</th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, index) => (
                  <tr key={line.id} className={rowClassName}>
                    <td className={cn(tdClassName, 'text-center text-erp-text-muted')}>{index + 1}</td>
                    <td className={cn(tdClassName, 'px-1.5')}>
                      <SelectField
                        options={productOptions}
                        value={line.product}
                        onValueChange={(value) => selectProduct(line.id, value)}
                        placeholder="请选择商品"
                        ariaLabel={`第${index + 1}行商品`}
                        variant="boxed"
                      />
                    </td>
                    <td className={cn(tdClassName, 'truncate text-erp-text-muted')}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(tdClassName, 'truncate text-erp-text-muted')}>{line.unit || EMPTY_PLACEHOLDER}</td>
                    <td className={cn(tdClassName, 'px-1.5')}>
                      <Input
                        type="number"
                        min="1"
                        value={line.quantity}
                        onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                        className="text-right"
                        aria-label={`第${index + 1}行实际出库数量`}
                      />
                    </td>
                    <td className={cn(tdClassName, 'text-center')}>
                      <Button
                        variant="danger"
                        size="icon"
                        aria-label={`删除第${index + 1}行`}
                        title="删除明细"
                        disabled={form.lines.length <= 1}
                        onClick={() => setForm((current) => ({
                          ...current,
                          lines: current.lines.length <= 1
                            ? current.lines
                            : current.lines.filter((item) => item.id !== line.id),
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
          <div className="text-[12px] text-erp-text-muted">演示数据：生成后从「未推送」开始，由 Demo 模拟推送财务ERP进度；库存不足时阻断且不生成出库单。</div>
        </div>
      </div>
    </SimpleDialog>
  );
}
