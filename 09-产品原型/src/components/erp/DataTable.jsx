import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { ClipboardCopy, Maximize2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { HintTooltip } from '../ui/tooltip.jsx';

export function DataTable({ rows, autoFitRows = rows, columns, selectedIds, onToggleRow, onToggleAll, rowActions = [], onRowAction, onCellClick, onFeedback, emptyText = '暂无数据' }) {
  const operationColumnWidth = 208;
  const selectionColumnWidth = 48;
  const [columnWidths, setColumnWidths] = useState(() => Object.fromEntries(columns.map((column) => [column.key, column.defaultWidth])));
  const [containerWidth, setContainerWidth] = useState(0);
  const containerRef = useRef(null);
  const tableRef = useRef(null);
  const resizeRef = useRef(null);
  const [contextMenuColumn, setContextMenuColumn] = useState(null);

  useEffect(() => {
    setColumnWidths((current) => Object.fromEntries(columns.map((column) => [column.key, current[column.key] ?? column.defaultWidth])));
  }, [columns]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    function updateWidth() {
      setContainerWidth(container.clientWidth);
    }

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    function handlePointerMove(event) {
      const resize = resizeRef.current;
      if (!resize) return;
      const nextWidth = clampColumnWidth(resize.column, resize.startWidth + event.clientX - resize.startX);
      setColumnWidths((current) => current[resize.key] === nextWidth ? current : { ...current, [resize.key]: nextWidth });
    }

    function stopResize() {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
      stopResize();
    };
  }, []);

  const getColumnWidth = (column) => columnWidths[column.key] ?? column.defaultWidth;
  const dataColumnsWidth = useMemo(
    () => columns.reduce((total, column) => total + getColumnWidth(column), 0),
    [columns, columnWidths],
  );
  const minTableWidth = selectionColumnWidth + operationColumnWidth + dataColumnsWidth;
  const tableWidth = Math.max(minTableWidth, containerWidth);
  const extraWidth = Math.max(0, tableWidth - minTableWidth);
  const getEffectiveColumnWidth = (column) => {
    const baseWidth = getColumnWidth(column);
    if (!extraWidth || !dataColumnsWidth) return baseWidth;
    return baseWidth + (extraWidth * baseWidth) / dataColumnsWidth;
  };
  const visibleSelectedIds = useMemo(() => rows.filter((row) => selectedIds.includes(row.id)).map((row) => row.id), [rows, selectedIds]);
  const allSelected = rows.length > 0 && visibleSelectedIds.length === rows.length;
  const someSelected = visibleSelectedIds.length > 0 && !allSelected;

  function startResize(event, column) {
    event.preventDefault();
    event.stopPropagation();
    resizeRef.current = { key: column.key, column, startX: event.clientX, startWidth: getColumnWidth(column) };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  async function copyValue(value, successMessage = '已复制单元格内容') {
    try {
      await navigator.clipboard.writeText(String(value ?? ''));
      onFeedback?.(value ? successMessage : '已复制空内容');
    } catch {
      onFeedback?.('复制失败，请检查浏览器剪贴板权限');
    }
  }

  function getAutoFitColumnWidth(column) {
    const table = tableRef.current;
    if (!table) return null;

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.font = getComputedStyle(table).font;

    const columnIndex = columns.findIndex((item) => item.key === column.key);
    if (columnIndex < 0) return null;
    const values = [
      column.label,
      ...autoFitRows.map((row) => getColumnDisplayText(column, row)),
    ];
    const contentWidth = Math.max(...values.map((value) => context.measureText(value).width), 0);
    const headerCell = table.tHead?.rows[0]?.cells[columnIndex + 1];
    const bodyCell = table.tBodies[0]?.rows[0]?.cells[columnIndex + 1];
    const sampleCell = bodyCell || headerCell;
    const cellStyle = sampleCell ? getComputedStyle(sampleCell) : null;
    const horizontalPadding = cellStyle ? Number.parseFloat(cellStyle.paddingLeft) + Number.parseFloat(cellStyle.paddingRight) : 0;
    return clampColumnWidth(column, Math.ceil(contentWidth + horizontalPadding));
  }

  function autoFitColumn(column) {
    const nextWidth = getAutoFitColumnWidth(column);
    if (!nextWidth) return;
    setColumnWidths((current) => ({ ...current, [column.key]: nextWidth }));
    onFeedback?.(`已根据当前内容自适应“${column.label}”列宽`);
  }

  function resetColumnWidths() {
    setColumnWidths(Object.fromEntries(columns.map((column) => [column.key, column.defaultWidth])));
    onFeedback?.('已恢复默认列宽');
  }

  function adjustColumnWidth(column, delta) {
    setColumnWidths((current) => ({
      ...current,
      [column.key]: clampColumnWidth(column, getColumnWidth(column) + delta),
    }));
  }

  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuTrigger asChild>
        <div
          ref={containerRef}
          className="table-scroll relative min-h-0 flex-1 overflow-auto border-y border-erp-border-table-row bg-erp-surface-panel"
          onContextMenu={(event) => {
            if (!event.target.closest('th')) setContextMenuColumn(null);
          }}
        >
          <table ref={tableRef} className="table-fixed border-collapse text-left text-[12px] text-erp-text" style={{ width: tableWidth }}>
        <colgroup>
          <col style={{ width: selectionColumnWidth }} />
          {columns.map((column) => <col key={column.key} style={{ width: getEffectiveColumnWidth(column) }} />)}
          <col style={{ width: operationColumnWidth }} />
        </colgroup>
        <thead className="sticky top-0 z-20 h-8 border-b border-erp-border-table-header bg-erp-surface-table-head text-[12px] font-normal text-erp-text-section">
          <tr className="h-8">
            <th scope="col" className="border-r border-erp-border-table-column text-center">
              <Checkbox
                aria-label="选择当前页全部数据"
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                onCheckedChange={(checked) => onToggleAll(checked === true)}
              />
            </th>
            {columns.map((column) => (
              <th scope="col" key={column.key} className="relative border-r border-erp-border-table-column px-2 font-normal" onContextMenu={() => setContextMenuColumn(column)}>
                <EllipsisCell content={column.label} ellipsis={column.ellipsis} className="block whitespace-nowrap">{column.label}</EllipsisCell>
                <span
                  role="separator"
                  aria-orientation="vertical"
                  aria-label={`调整${column.label}列宽`}
                  tabIndex="0"
                  className="absolute inset-y-0 right-0 z-10 w-1.5 cursor-col-resize hover:bg-erp-primary/35 focus:bg-erp-primary/45"
                  onPointerDown={(event) => startResize(event, column)}
                  onKeyDown={(event) => { if (event.key === 'ArrowRight') adjustColumnWidth(column, 8); if (event.key === 'ArrowLeft') adjustColumnWidth(column, -8); }}
                />
              </th>
            ))}
            <th scope="col" className="table-operation-sticky sticky right-0 z-30 bg-erp-surface-table-head px-3 text-left font-normal text-erp-text-section">操作</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 2} className="h-32 text-center text-[12px] text-erp-text-subtle">{emptyText}</td>
            </tr>
          ) : rows.map((row, index) => {
            const selected = selectedIds.includes(row.id);
            const rowClass = selected ? 'bg-erp-surface-selected' : index % 2 ? 'bg-erp-surface-table-zebra' : 'bg-erp-surface-panel';
            const actions = rowActions.filter((action) => !action.visibleWhen || action.visibleWhen(row));
            return (
              <tr key={row.id} className={`group h-10 border-b border-erp-border-table-row ${rowClass} hover:bg-erp-surface-hover`}>
                <td className="border-r border-erp-border-table-column text-center">
                  <Checkbox
                    aria-label={`选择${row.orderNo || row.inboundNo || row.id}`}
                    checked={selected}
                    onCheckedChange={() => onToggleRow(row.id)}
                  />
                </td>
                {columns.map((column) => {
                  const value = row[column.key];
                  const cell = column.render ? column.render(value, row) : value ?? '';
                  const tone = column.tone ? column.tone(value, row) : '';
                  const isLinkCell = column.link && onCellClick;
                  const cellText = getCellText(cell);
                  const cellInner = isLinkCell ? (
                    <EllipsisCell
                      as="button"
                      type="button"
                      content={cellText}
                      ellipsis={column.ellipsis}
                      className="block min-h-4 max-w-full truncate text-left hover:underline"
                      onClick={(event) => {
                        event.stopPropagation();
                        onCellClick(column, row);
                      }}
                    >
                      {cell}
                    </EllipsisCell>
                  ) : (
                    <EllipsisCell content={cellText} ellipsis={column.ellipsis} className="block min-h-4 max-w-full">{cell}</EllipsisCell>
                  );
                  const cellContent = column.copyable === false ? cellInner : (
                    <ContextMenuPrimitive.Root>
                      <ContextMenuTrigger asChild>
                        <span className="block min-h-4" onContextMenu={(event) => event.stopPropagation()}>{cellInner}</span>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onSelect={() => copyValue(value)}>
                          <ClipboardCopy className="h-3.5 w-3.5 text-erp-primary" strokeWidth={1.8} />
                          <span>复制</span>
                        </ContextMenuItem>
                        <ColumnWidthMenuItems onAutoFit={() => autoFitColumn(column)} onReset={resetColumnWidths} />
                      </ContextMenuContent>
                    </ContextMenuPrimitive.Root>
                  );
                  return <td key={column.key} className={cn(column.ellipsis && 'overflow-hidden', 'border-r border-erp-border-table-column px-2 align-middle whitespace-nowrap', column.link && 'text-erp-primary', column.align === 'right' && 'text-right', tone)}>{cellContent}</td>;
                })}
                <td className={`table-operation-sticky sticky right-0 z-10 px-3 ${rowClass} group-hover:bg-erp-surface-hover`}>
                  <div className="flex items-center justify-start gap-1 whitespace-nowrap text-[12px]">
                    {actions.map((action) => <RowAction key={action.id} action={action} row={row} onAction={onRowAction} />)}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
          </table>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {contextMenuColumn && (
          <ContextMenuItem onSelect={() => copyValue(contextMenuColumn.label, '已复制列标题')}>
            <ClipboardCopy className="h-3.5 w-3.5 text-erp-primary" strokeWidth={1.8} />
            <span>复制</span>
          </ContextMenuItem>
        )}
        {contextMenuColumn && <AutoFitColumnMenuItem onSelect={() => autoFitColumn(contextMenuColumn)} />}
        <ResetColumnWidthsMenuItem onSelect={resetColumnWidths} />
      </ContextMenuContent>
    </ContextMenuPrimitive.Root>
  );
}

function ColumnWidthMenuItems({ onAutoFit, onReset }) {
  return (
    <>
      <AutoFitColumnMenuItem onSelect={onAutoFit} />
      <ResetColumnWidthsMenuItem onSelect={onReset} />
    </>
  );
}

function AutoFitColumnMenuItem({ onSelect }) {
  return (
    <ContextMenuItem onSelect={onSelect}>
      <Maximize2 className="h-3.5 w-3.5 text-erp-primary" strokeWidth={1.8} />
      <span>自适应列宽</span>
    </ContextMenuItem>
  );
}

function ResetColumnWidthsMenuItem({ onSelect }) {
  return (
    <ContextMenuItem onSelect={onSelect}>
      <RotateCcw className="h-3.5 w-3.5 text-erp-primary" strokeWidth={1.8} />
      <span>恢复默认列宽</span>
    </ContextMenuItem>
  );
}

function clampColumnWidth(column, width) {
  return Math.min(column.maxWidth, Math.max(column.minWidth, width));
}

function getCellText(value) {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return '';
}

function getColumnDisplayText(column, row) {
  const value = column.render ? column.render(row[column.key], row) : row[column.key];
  return getCellText(value);
}

function EllipsisCell({ as: Element = 'span', content, ellipsis = true, className, children, ...props }) {
  const ref = useRef(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || !ellipsis || !content) {
      setIsTruncated(false);
      return undefined;
    }

    function updateTruncation() {
      setIsTruncated(node.scrollWidth > node.clientWidth);
    }

    updateTruncation();
    const observer = new ResizeObserver(updateTruncation);
    observer.observe(node);
    return () => observer.disconnect();
  }, [content, ellipsis]);

  const element = (
    <Element ref={ref} className={cn(className, ellipsis && 'max-w-full truncate')} {...props}>
      {children}
    </Element>
  );

  return <HintTooltip content={isTruncated ? content : undefined}>{element}</HintTooltip>;
}

function RowAction({ action, row, onAction }) {
  const disabled = action.disabledWhen?.(row) || false;
  const trigger = (
    <Button
      variant={action.variant || 'text'}
      size="compact"
      disabled={disabled}
      className="h-8 gap-1 rounded-erp-control px-2 text-[12px] font-normal hover:bg-erp-primary-soft hover:text-erp-primary"
      onClick={() => onAction?.(action.id, row)}
    >
      {action.label}
    </Button>
  );
  if (!action.confirm) return trigger;
  return <ConfirmDialog trigger={trigger} title={action.confirm.title} description={action.confirm.description} confirmLabel={action.confirm.confirmLabel || '确认'} confirmVariant={action.confirm.confirmVariant || 'primary'} onConfirm={() => onAction?.(action.id, row)} />;
}
