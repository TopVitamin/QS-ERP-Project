import { Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../ui/button.jsx';
import { SimpleDialog } from '../ui/dialog.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { FormField } from '../ui/form-field.jsx';
import { cn } from '../../lib/utils.js';
import { productOptions } from '../../data/masterData.js';
import { getInventoryLogicalWarehouseOptions } from '../../data/warehouseData.js';
import { createOtherInboundFromWarehousePush, otherInboundBusinessTypes } from '../../lib/otherInboundLogic.js';

const lineTableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const lineHeadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const lineThClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const lineRowClassName = 'h-8 border-b border-erp-border-table-row';
const lineTdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

let mockLineSequence = 0;

function createMockLine() {
  mockLineSequence += 1;
  return { id: `warehouse-push-line-${Date.now()}-${mockLineSequence}`, product: '', quantity: 1 };
}

function createMockPushForm() {
  return {
    warehouse: '',
    businessType: '盘盈',
    sourceSystem: 'WMS',
    sourceNo: '',
    lines: [createMockLine()],
  };
}

/**
 * 其他入库单模块弹窗：Demo「模拟仓库主动回传」。
 * 正式规则见《其他入库单主PRD》R04（不补建申请、不补通知）；弹窗文案与生成规则见
 * 《其他入库单前端Demo版PRD_弹窗与Mock》§3。本模块不提供重推金蝶、编辑、取消等弹窗（§1.1）。
 */
export function OtherInboundActionDialogs({ dialog, onClose, onComplete, onNotify }) {
  const [form, setForm] = useState(createMockPushForm);

  useEffect(() => {
    if (dialog) setForm(createMockPushForm());
  }, [dialog]);

  if (!dialog) return null;

  const { type } = dialog;

  if (type === 'warehouse-push') {
    // 选项按当前主数据实时读取：入库仓库只能选审核通过且启用的逻辑仓（不含虚拟在途仓）。
    const warehouseOptions = getInventoryLogicalWarehouseOptions({ includeDisabled: false, includeTransit: false });
    const businessTypeOptions = otherInboundBusinessTypes.map((value) => ({ value, label: value }));

    function updateLine(lineId, key, value) {
      setForm((current) => ({
        ...current,
        lines: current.lines.map((line) => (line.id === lineId ? { ...line, [key]: value } : line)),
      }));
    }

    return (
      <SimpleDialog
        open
        onOpenChange={(open) => { if (!open) onClose?.(); }}
        size="xl"
        title="模拟仓库主动回传（Demo）"
        description="按仓库已完成的实际变动生成演示用已审核入库单；正式流程以仓库回传为准，不补建申请单。"
        footer={(
          <>
            <Button variant="outline" size="compact" onClick={onClose}>取消</Button>
            <Button
              variant="primary"
              size="compact"
              onClick={() => {
                try {
                  const inbound = createOtherInboundFromWarehousePush(form);
                  onComplete?.({ message: `已生成其他入库单 ${inbound.inboundNo}（Demo）`, type: 'success', row: inbound });
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
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FormField label="入库仓库 *">
            <SelectField
              options={warehouseOptions}
              value={form.warehouse}
              onValueChange={(value) => setForm((current) => ({ ...current, warehouse: value }))}
              placeholder="请选择入库仓库"
              ariaLabel="入库仓库"
            />
          </FormField>
          <FormField label="业务类型 *">
            <SelectField
              options={businessTypeOptions}
              value={form.businessType}
              onValueChange={(value) => setForm((current) => ({ ...current, businessType: value }))}
              placeholder="请选择业务类型"
              ariaLabel="业务类型"
            />
          </FormField>
          <FormField label="来源系统 *">
            <Input
              value={form.sourceSystem}
              onChange={(event) => setForm((current) => ({ ...current, sourceSystem: event.target.value }))}
              placeholder="请输入来源系统"
              aria-label="来源系统"
            />
          </FormField>
          <FormField label="来源单号 *">
            <Input
              value={form.sourceNo}
              onChange={(event) => setForm((current) => ({ ...current, sourceNo: event.target.value }))}
              placeholder="请输入来源单号"
              aria-label="来源单号"
            />
          </FormField>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[12px] text-erp-text-section">商品明细</span>
          <Button variant="outline" size="compact" onClick={() => setForm((current) => ({ ...current, lines: [...current.lines, createMockLine()] }))}>
            <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
            添加明细
          </Button>
        </div>

        <div className="mt-2 table-scroll overflow-x-auto">
          <table className={lineTableClassName} style={{ minWidth: '520px' }}>
            <colgroup>
              <col className="w-10" />
              <col className="w-[220px]" />
              <col className="w-[120px]" />
              <col className="w-[64px]" />
            </colgroup>
            <thead className={lineHeadClassName}>
              <tr>
                <th className={lineThClassName}>行号</th>
                <th className={lineThClassName}>商品 *</th>
                <th className={cn(lineThClassName, 'text-right')}>数量 *</th>
                <th className={lineThClassName}>操作</th>
              </tr>
            </thead>
            <tbody>
              {form.lines.map((line, index) => (
                <tr key={line.id} className={lineRowClassName}>
                  <td className={cn(lineTdClassName, 'text-center text-erp-text-muted')}>{index + 1}</td>
                  <td className={cn(lineTdClassName, 'px-1.5')}>
                    <SelectField
                      options={productOptions}
                      value={line.product}
                      onValueChange={(value) => updateLine(line.id, 'product', value)}
                      placeholder="请选择商品"
                      ariaLabel={`第${index + 1}行商品`}
                      variant="boxed"
                    />
                  </td>
                  <td className={cn(lineTdClassName, 'px-1.5')}>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.id, 'quantity', event.target.value)}
                      className="text-right"
                      aria-label={`第${index + 1}行数量`}
                    />
                  </td>
                  <td className={cn(lineTdClassName, 'px-1.5')}>
                    <Button
                      variant="danger"
                      size="icon"
                      aria-label={`删除第${index + 1}行`}
                      title="删除明细"
                      disabled={form.lines.length <= 1}
                      onClick={() => setForm((current) => ({
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
          生成后：审核状态=已审核、金蝶推送状态从未推送开始由 Demo 模拟推送进度；库存按所选逻辑仓增加，写一条增加方向库存流水。
          演示数据与正式回传生成的入库单以「Demo 演示数据」标记区分。
        </p>
      </SimpleDialog>
    );
  }

  return null;
}
