import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { calculateLineAmount, formatAmount, productLabel } from '../../lib/format.js';
import { FieldAffordance, FieldTrigger } from '../ui/field.jsx';
import { FieldLabelContent, parseFieldLabel } from '../ui/form-field.jsx';
import { cn } from '../../lib/utils.js';
import { DocumentSummaryBar } from './DocumentSummaryBar.jsx';
import { SkuSelectionDialog } from './SkuSelectionDialog.jsx';

const tableShellClassName = 'overflow-x-auto';
const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const theadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row';
const tdClassName = 'border-r border-erp-border-table-column align-middle last:border-r-0';
const cellPaddingClassName = 'px-1.5';
const readCellClassName = 'px-2';

const variants = {
  order: {
    minWidth: '1120px',
    colgroup: ['w-10', 'w-[190px]', 'w-[150px]', 'w-[74px]', 'w-[92px]', 'w-[92px]', 'w-[110px]', 'w-[88px]', 'w-[130px]', 'w-[150px]', 'w-[72px]'],
    editColumns: [
      { key: 'index', label: '#', align: 'center' },
      { key: 'product', label: '商品 *', required: true },
      { key: 'spec', label: '规格型号' },
      { key: 'unit', label: '单位' },
      { key: 'quantity', label: '采购数量 *', align: 'right', required: true },
      { key: 'received', label: '已入库', align: 'right', readOnly: true },
      { key: 'price', label: '含税单价 *', align: 'right', required: true },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'amount', label: '含税金额', align: 'right' },
      { key: 'remark', label: '备注' },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '#', align: 'center' },
      { key: 'product', label: '商品' },
      { key: 'spec', label: '规格型号' },
      { key: 'unit', label: '单位' },
      { key: 'quantity', label: '采购数量', align: 'right' },
      { key: 'received', label: '已入库', align: 'right', muted: true },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'taxRate', label: '税率', align: 'right' },
      { key: 'amount', label: '含税金额', align: 'right' },
      { key: 'remark', label: '备注' },
    ],
    viewColgroup: ['w-10', 'w-[190px]', 'w-[150px]', 'w-[74px]', 'w-[92px]', 'w-[92px]', 'w-[110px]', 'w-[88px]', 'w-[130px]', 'w-[150px]'],
  },
  inbound: {
    minWidth: '1050px',
    colgroup: ['w-10', 'w-[205px]', 'w-[160px]', 'w-[74px]', 'w-[110px]', 'w-[110px]', 'w-[110px]', 'w-[130px]', 'w-[150px]', 'w-[72px]'],
    editColumns: [
      { key: 'index', label: '#', align: 'center' },
      { key: 'product', label: '商品 *', required: true },
      { key: 'spec', label: '规格型号' },
      { key: 'unit', label: '单位' },
      { key: 'orderQuantity', label: '订单数量', align: 'right', readOnly: true },
      { key: 'quantity', label: '本次入库 *', align: 'right', required: true },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'amount', label: '入库金额', align: 'right' },
      { key: 'remark', label: '备注' },
      { key: 'actions', label: '操作', align: 'center' },
    ],
    viewColumns: [
      { key: 'index', label: '#', align: 'center' },
      { key: 'product', label: '商品' },
      { key: 'spec', label: '规格型号' },
      { key: 'unit', label: '单位' },
      { key: 'orderQuantity', label: '订单数量', align: 'right' },
      { key: 'quantity', label: '本次入库', align: 'right' },
      { key: 'price', label: '含税单价', align: 'right' },
      { key: 'amount', label: '入库金额', align: 'right' },
      { key: 'remark', label: '备注' },
    ],
    viewColgroup: ['w-10', 'w-[205px]', 'w-[160px]', 'w-[74px]', 'w-[110px]', 'w-[110px]', 'w-[110px]', 'w-[130px]', 'w-[150px]'],
  },
};

function alignClassName(align) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

const emptyEditorOptions = {
  productOptions: [],
  unitOptions: [],
  taxRateOptions: [],
};

function renderEditCell({ column, line, index, onLineChange, onLineRemove, onProductSelect, skuPickerEnabled, editorOptions }) {
  const rowLabel = `第${index + 1}行`;
  const cellLabel = `${rowLabel}${parseFieldLabel(column.label).text}`;

  switch (column.key) {
    case 'index':
      return <span className="text-erp-text-muted">{index + 1}</span>;
    case 'product':
      if (skuPickerEnabled && editorOptions.skuOptions?.length) {
        return (
          <FieldTrigger
            aria-label={`${rowLabel}商品`}
            aria-haspopup="dialog"
            hasValue={Boolean(line.product)}
            variant="boxed"
            onClick={() => onProductSelect?.(line.id)}
          >
            <span className="truncate">{productLabel(line.product, editorOptions.productOptions)}</span>
            <FieldAffordance hasValue={false} />
          </FieldTrigger>
        );
      }
      return (
        <SelectField
          options={editorOptions.productOptions}
          value={line.product}
          onValueChange={(value) => onLineChange(line.id, 'product', value)}
          placeholder="请选择商品"
          ariaLabel={`${rowLabel}商品`}
          variant="boxed"
        />
      );
    case 'spec':
      return <Input variant="boxed" value={line.spec} onChange={(event) => onLineChange(line.id, 'spec', event.target.value)} placeholder="规格型号" aria-label={cellLabel} />;
    case 'unit':
      return (
        <SelectField
          options={editorOptions.unitOptions}
          value={line.unit}
          onValueChange={(value) => onLineChange(line.id, 'unit', value)}
          ariaLabel={`${rowLabel}单位`}
          variant="boxed"
        />
      );
    case 'quantity':
      return (
        <Input
          variant="boxed"
          type="number"
          min="0"
          max={line.orderQuantity || undefined}
          value={line.quantity}
          onChange={(event) => onLineChange(line.id, 'quantity', event.target.value)}
          className="text-right"
          aria-label={cellLabel}
        />
      );
    case 'orderQuantity':
    case 'received':
      return <span className="text-erp-text-muted">{line[column.key] || 0}</span>;
    case 'price':
      return (
        <Input
          variant="boxed"
          type="number"
          min="0"
          step="0.01"
          value={line.price}
          onChange={(event) => onLineChange(line.id, 'price', event.target.value)}
          className="text-right"
          aria-label={cellLabel}
        />
      );
    case 'taxRate':
      return (
        <SelectField
          options={editorOptions.taxRateOptions}
          value={line.taxRate}
          onValueChange={(value) => onLineChange(line.id, 'taxRate', value)}
          ariaLabel={`${rowLabel}税率`}
          variant="boxed"
        />
      );
    case 'amount':
      return <span className="font-medium text-erp-text-section">{formatAmount(calculateLineAmount(line))}</span>;
    case 'remark':
      return <Input variant="boxed" value={line.remark} onChange={(event) => onLineChange(line.id, 'remark', event.target.value)} placeholder="—" aria-label={cellLabel} />;
    case 'actions':
      return (
        <Button variant="danger" size="icon" aria-label={`删除${rowLabel}`} title="删除明细" onClick={() => onLineRemove(line.id)}>
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
        </Button>
      );
    default:
      return line[column.key] ?? '—';
  }
}

function renderViewCell({ column, line, editorOptions }) {
  switch (column.key) {
    case 'product':
      return productLabel(line.product, editorOptions.productOptions);
    case 'spec':
    case 'unit':
    case 'remark':
      return line[column.key] || '—';
    case 'quantity':
    case 'orderQuantity':
    case 'received':
      return line[column.key] || 0;
    case 'price':
      return formatAmount(line.price);
    case 'taxRate':
      return line.taxRate ? `${line.taxRate}%` : '—';
    case 'amount':
      return formatAmount(calculateLineAmount(line));
    default:
      return line[column.key] ?? '—';
  }
}

export function LineItemTable({
  variant,
  mode = 'view',
  lines,
  rowKeyPrefix = 'line',
  onLineChange,
  onLineRemove,
  onLineSkusSelect,
  enableSkuPicker = false,
  editorOptions = emptyEditorOptions,
  summary,
}) {
  const [skuDialogLineId, setSkuDialogLineId] = useState(null);
  const config = variants[variant];
  const isEdit = mode === 'edit';
  const columns = isEdit ? config.editColumns : config.viewColumns;
  const colgroup = isEdit ? config.colgroup : (config.viewColgroup || config.colgroup.slice(0, -1));
  const activeSkuLine = lines.find((line) => line.id === skuDialogLineId);
  const skuOptions = enableSkuPicker ? (editorOptions.skuOptions || []) : [];

  return (
    <div className={tableShellClassName}>
      <table className={tableClassName} style={{ minWidth: config.minWidth }}>
        <colgroup>
          {colgroup.map((width, index) => (
            <col key={`${width}-${index}`} className={width} />
          ))}
        </colgroup>
        <thead className={theadClassName}>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={cn(thClassName, alignClassName(column.align))}>
                <span className="inline-flex min-w-0 items-center">
                  <FieldLabelContent label={column.label} required={column.required} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={line.id || `${rowKeyPrefix}-${index}`} className={rowClassName}>
              {columns.map((column) => {
                const isActionCell = column.key === 'actions';
                const isEditableCell = isEdit && !column.readOnly && !isActionCell && column.key !== 'index' && column.key !== 'amount';
                const content = isEdit
                  ? renderEditCell({ column, line, index, onLineChange, onLineRemove, onProductSelect: setSkuDialogLineId, skuPickerEnabled: enableSkuPicker, editorOptions })
                  : column.key === 'index'
                    ? index + 1
                    : renderViewCell({ column, line, editorOptions });

                return (
                  <td
                    key={column.key}
                    className={cn(
                      tdClassName,
                      alignClassName(column.align),
                      isEditableCell ? cellPaddingClassName : readCellClassName,
                      column.key === 'product' && !isEdit && 'text-erp-text',
                      column.muted && 'text-erp-text-muted',
                      column.key === 'amount' && 'font-medium text-erp-text-section',
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        {summary && <DocumentSummaryBar columns={columns} summary={summary} />}
      </table>
      {isEdit && skuOptions.length > 0 && (
        <SkuSelectionDialog
          open={Boolean(activeSkuLine)}
          onOpenChange={(open) => {
            if (!open) setSkuDialogLineId(null);
          }}
          options={skuOptions}
          selectedValues={activeSkuLine?.product ? [activeSkuLine.product] : []}
          onConfirm={(selectedSkus) => {
            if (activeSkuLine) onLineSkusSelect?.(activeSkuLine.id, selectedSkus);
            setSkuDialogLineId(null);
          }}
        />
      )}
    </div>
  );
}
