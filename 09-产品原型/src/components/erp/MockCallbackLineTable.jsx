import { Input } from '../ui/input.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const headClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row';
const tdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';

/** 通知单类列宽：行号/编码/条码/名称/通知数量/实出(收)数量。 */
const NOTICE_COLGROUP = ['w-10', 'w-[108px]', 'w-[108px]', 'w-[140px]', 'w-[88px]', 'w-[96px]'];
/** 申请单类列宽：行号/编码/名称/基本单位/申请数量/实出数量。 */
const REQUEST_COLGROUP = ['w-10', 'w-[108px]', 'w-[160px]', 'w-[64px]', 'w-[104px]', 'w-[104px]'];

/**
 * 「模拟仓库回传」弹窗的行数量录入表（Demo）。
 * 通用骨架：行号 + 商品列 + 计划数量列 + 可编辑实发（收）数量列；录入超过计划数量时
 * 自动截断为计划数量并提示。模块差异经 props 传入：数量上限字段、clamp 函数、列文案、
 * 是否展示条码/基本单位列。弹窗标题、说明与零出/零收勾选留在各模块 ActionDialogs。
 */
export function MockCallbackLineTable({
  lines,
  values,
  onValuesChange,
  clamp,
  limitKey = 'notifyQty',
  limitLabel = '通知数量',
  quantityLabel = '实出数量',
  limitExceededMessage,
  onNotify,
  disabled = false,
  showBarcode = true,
  showUnit = false,
}) {
  const exceededMessage = limitExceededMessage || `${quantityLabel}不能超过${limitLabel}，已自动调整为${limitLabel}`;
  const colgroup = showUnit ? REQUEST_COLGROUP : NOTICE_COLGROUP;

  function updateValue(index, nextValue) {
    const next = [...values];
    next[index] = nextValue;
    onValuesChange(next);
  }

  return (
    <div className="table-scroll overflow-x-auto">
      <table className={tableClassName} style={{ minWidth: '720px' }}>
        <colgroup>
          {colgroup.map((width, index) => <col key={`${width}-${index}`} className={width} />)}
        </colgroup>
        <thead className={headClassName}>
          <tr>
            <th className={thClassName}>行号</th>
            <th className={thClassName}>商品编码</th>
            {showBarcode && <th className={thClassName}>商品条码</th>}
            <th className={thClassName}>商品名称</th>
            {showUnit && <th className={thClassName}>基本单位</th>}
            <th className={cn(thClassName, 'text-right')}>{limitLabel}</th>
            <th className={cn(thClassName, 'text-right')}>{quantityLabel}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const limit = Number(line[limitKey] || 0);
            return (
              <tr key={line.id || index} className={rowClassName}>
                <td className={cn(tdClassName, 'text-center text-erp-text-muted')}>{index + 1}</td>
                <td className={cn(tdClassName, 'truncate')} title={line.productCode}>{line.productCode || EMPTY_PLACEHOLDER}</td>
                {showBarcode && (
                  <td className={cn(tdClassName, 'truncate text-erp-text-muted')} title={line.barcode}>{line.barcode || EMPTY_PLACEHOLDER}</td>
                )}
                <td className={cn(tdClassName, 'truncate')} title={line.productName}>{line.productName || EMPTY_PLACEHOLDER}</td>
                {showUnit && <td className={cn(tdClassName, 'truncate text-erp-text-muted')}>{line.unit || EMPTY_PLACEHOLDER}</td>}
                <td className={cn(tdClassName, 'text-right')}>{line[limitKey] ?? 0}</td>
                <td className={cn(tdClassName, 'px-1.5')}>
                  <Input
                    type="number"
                    min="0"
                    max={line[limitKey]}
                    value={values[index] ?? ''}
                    disabled={disabled}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === '') {
                        updateValue(index, '');
                        return;
                      }
                      const parsed = Number(raw);
                      if (!Number.isFinite(parsed)) return;
                      if (parsed > limit) {
                        updateValue(index, String(limit));
                        onNotify?.(exceededMessage, 'warning');
                        return;
                      }
                      updateValue(index, raw);
                    }}
                    onBlur={() => {
                      const clamped = clamp(values[index], limit);
                      if (String(values[index] ?? '') !== String(clamped)) {
                        updateValue(index, String(clamped));
                      }
                    }}
                    className="text-right"
                    aria-label={`第${index + 1}行${quantityLabel}`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
