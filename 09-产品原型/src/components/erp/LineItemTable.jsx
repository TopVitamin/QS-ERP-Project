import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { calculateLineAmount, formatAmount, productLabel } from '../../lib/format.js';
import { productOptions, taxRateOptions, unitOptions } from '../../data/purchaseFormData.js';
import { FieldLabelContent } from '../ui/form-field.jsx';
import { cn } from '../../lib/utils.js';

const tableShellClassName = 'overflow-x-auto';
const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const theadClassName = 'h-9 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-12 border-b border-erp-border-table-row even:bg-erp-surface-table-zebra';
const tdClassName = 'border-r border-erp-border-table-column last:border-r-0';
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

function renderEditCell({ column, line, index, onLineChange, onLineRemove }) {
  const rowLabel = `第${index + 1}行`;

  switch (column.key) {
    case 'index':
      return <span className="text-erp-text-subtle">{index + 1}</span>;
    case 'product':
      return (
        <SelectField
          options={productOptions}
          value={line.product}
          onValueChange={(value) => onLineChange(line.id, 'product', value)}
          placeholder="请选择商品"
          ariaLabel={`${rowLabel}商品`}
        />
      );
    case 'spec':
      return <Input value={line.spec} onChange={(event) => onLineChange(line.id, 'spec', event.target.value)} placeholder="规格型号" />;
    case 'unit':
      return (
        <SelectField
          options={unitOptions}
          value={line.unit}
          onValueChange={(value) => onLineChange(line.id, 'unit', value)}
          ariaLabel={`${rowLabel}单位`}
        />
      );
    case 'quantity':
      return (
        <Input
          type="number"
          min="0"
          max={line.orderQuantity || undefined}
          value={line.quantity}
          onChange={(event) => onLineChange(line.id, 'quantity', event.target.value)}
          className="text-right"
        />
      );
    case 'orderQuantity':
    case 'received':
      return <span className="text-erp-text-subtle">{line[column.key] || 0}</span>;
    case 'price':
      return (
        <Input
          type="number"
          min="0"
          step="0.01"
          value={line.price}
          onChange={(event) => onLineChange(line.id, 'price', event.target.value)}
          className="text-right"
        />
      );
    case 'taxRate':
      return (
        <SelectField
          options={taxRateOptions}
          value={line.taxRate}
          onValueChange={(value) => onLineChange(line.id, 'taxRate', value)}
          ariaLabel={`${rowLabel}税率`}
        />
      );
    case 'amount':
      return <span className="font-medium text-erp-text-section">{formatAmount(calculateLineAmount(line))}</span>;
    case 'remark':
      return <Input value={line.remark} onChange={(event) => onLineChange(line.id, 'remark', event.target.value)} placeholder="—" />;
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

function renderViewCell({ column, line }) {
  switch (column.key) {
    case 'product':
      return productLabel(line.product);
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
}) {
  const config = variants[variant];
  const isEdit = mode === 'edit';
  const columns = isEdit ? config.editColumns : config.viewColumns;
  const colgroup = isEdit ? config.colgroup : (config.viewColgroup || config.colgroup.slice(0, -1));

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
                  ? renderEditCell({ column, line, index, onLineChange, onLineRemove })
                  : column.key === 'index'
                    ? index + 1
                    : renderViewCell({ column, line });

                return (
                  <td
                    key={column.key}
                    className={cn(
                      tdClassName,
                      alignClassName(column.align),
                      isEditableCell ? cellPaddingClassName : readCellClassName,
                      column.key === 'product' && !isEdit && 'text-erp-text',
                      column.muted && 'text-erp-text-subtle',
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
      </table>
    </div>
  );
}
