import * as ContextMenuPrimitive from '@radix-ui/react-context-menu';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, ClipboardCopy, Maximize2, RotateCcw } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '../ui/context-menu.jsx';
import { ConfirmDialog } from '../ui/alert-dialog.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu.jsx';
import { HintTooltip } from '../ui/tooltip.jsx';

export function DataTable({
  rows,
  autoFitRows = rows,
  columns,
  selectedIds = [],
  onToggleRow,
  onToggleAll,
  rowActions = [],
  rowActionsMaxVisible,
  onRowAction,
  onCellClick,
  onFeedback,
  sort,
  onSort,
  pinnedKeys = [],
  emptyText = '暂无数据',
}) {
  const showOperationColumn = rowActions.length > 0;
  const showSelectionColumn = Boolean(onToggleRow);
  const operationColumnWidth = useMemo(
    () => (showOperationColumn ? computeOperationColumnWidth(rows, rowActions, rowActionsMaxVisible) : 0),
    [rows, rowActions, rowActionsMaxVisible, showOperationColumn],
  );
  const selectionColumnWidth = showSelectionColumn ? 48 : 0;
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
  const columnOffsets = useMemo(() => {
    const offsets = {};
    let left = selectionColumnWidth;
    for (const column of columns) {
      if (!pinnedKeys.includes(column.key)) continue;
      offsets[column.key] = left;
      left += getEffectiveColumnWidth(column);
    }
    return offsets;
  }, [columns, pinnedKeys, columnWidths, containerWidth]);
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
          <table ref={tableRef} className="table-fixed border-separate border-spacing-0 text-left text-[12px] text-erp-text" style={{ width: tableWidth }}>
        <colgroup>
          {showSelectionColumn && <col style={{ width: selectionColumnWidth }} />}
          {columns.map((column) => <col key={column.key} style={{ width: getEffectiveColumnWidth(column) }} />)}
          {showOperationColumn && <col style={{ width: operationColumnWidth }} />}
        </colgroup>
        <thead className="sticky top-0 z-20 h-7 bg-erp-surface-table-head text-[12px] font-normal text-erp-text-section">
          <tr className="h-7">
            {showSelectionColumn && (
              <th scope="col" className="erp-table-head-cell sticky left-0 z-30 bg-erp-surface-table-head text-center">
                <Checkbox
                  aria-label="选择当前页全部数据"
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => onToggleAll?.(checked === true)}
                />
              </th>
            )}
            {columns.map((column) => {
              const isSorted = sort?.key === column.key;
              const pinnedOffset = columnOffsets[column.key];
              return (
              <th
                scope="col"
                key={column.key}
                aria-sort={isSorted ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                style={pinnedOffset != null ? { left: pinnedOffset } : undefined}
                className={cn(
                  'erp-table-head-cell group/th relative px-2 font-normal',
                  pinnedOffset != null && 'sticky z-20 bg-erp-surface-table-head',
                )}
                onContextMenu={() => setContextMenuColumn(column)}
              >
                {column.sortable ? (
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-center gap-1 text-left hover:text-erp-primary"
                    onClick={() => onSort?.(column.key)}
                  >
                    <EllipsisCell content={column.label} ellipsis={column.ellipsis} className="block min-w-0 whitespace-nowrap">{column.label}</EllipsisCell>
                    {isSorted ? (
                      sort.direction === 'asc'
                        ? <ArrowUp className="h-3 w-3 shrink-0 text-erp-primary" strokeWidth={2} />
                        : <ArrowDown className="h-3 w-3 shrink-0 text-erp-primary" strokeWidth={2} />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 shrink-0 text-erp-text-placeholder opacity-0 transition-opacity group-hover/th:opacity-100" strokeWidth={2} />
                    )}
                  </button>
                ) : (
                  <EllipsisCell content={column.label} ellipsis={column.ellipsis} className="block whitespace-nowrap">{column.label}</EllipsisCell>
                )}
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
              );
            })}
            {showOperationColumn && (
              <th scope="col" className="table-operation-sticky erp-table-head-cell sticky right-0 z-30 bg-erp-surface-table-head px-1.5 text-left font-normal text-erp-text-section">操作</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (showSelectionColumn ? 1 : 0) + (showOperationColumn ? 1 : 0)} className="h-32 border-b border-erp-border-table-row text-center text-[12px] text-erp-text-muted">{emptyText}</td>
            </tr>
          ) : rows.map((row) => {
            const selected = selectedIds.includes(row.id);
            const rowClass = selected ? 'bg-erp-surface-selected' : 'bg-erp-surface-panel';
            const actions = rowActions.filter((action) => !action.visibleWhen || action.visibleWhen(row));
            return (
              <tr key={row.id} className={`group h-8 ${rowClass} hover:bg-erp-surface-hover`}>
                {showSelectionColumn && (
                  <td className={cn('erp-table-cell sticky left-0 z-10 text-center', rowClass, 'group-hover:bg-erp-surface-hover')}>
                    <Checkbox
                      aria-label={`选择${row.orderNo || row.inboundNo || row.id}`}
                      checked={selected}
                      onCheckedChange={() => onToggleRow?.(row.id)}
                    />
                  </td>
                )}
                {columns.map((column) => {
                  const value = row[column.key];
                  const cell = column.render ? column.render(value, row) : (value === '' || value == null ? EMPTY_PLACEHOLDER : value);
                  const tone = column.tone ? column.tone(value, row) : '';
                  const isLinkCell = (typeof column.link === 'function' ? column.link(row) : column.link) && onCellClick;
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
                  const pinnedOffset = columnOffsets[column.key];
                  return (
                    <td
                      key={column.key}
                      style={pinnedOffset != null ? { left: pinnedOffset } : undefined}
                      className={cn(
                        column.ellipsis && 'overflow-hidden',
                        'erp-table-cell px-2 align-middle whitespace-nowrap',
                        pinnedOffset != null && `sticky z-[5] ${rowClass} group-hover:bg-erp-surface-hover`,
                        column.link && 'text-erp-primary',
                        column.align === 'right' && 'text-right',
                        tone,
                      )}
                    >
                      {cellContent}
                    </td>
                  );
                })}
                {showOperationColumn && (
                  <td className={`table-operation-sticky erp-table-cell sticky right-0 z-10 px-1.5 ${rowClass} group-hover:bg-erp-surface-hover`}>
                    <RowActionsCell
                      actions={actions}
                      row={row}
                      onAction={onRowAction}
                      maxVisible={rowActionsMaxVisible}
                    />
                  </td>
                )}
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

function estimateActionButtonWidth(label) {
  const text = String(label || '');
  return Math.min(76, Math.max(26, text.length * 12 + 8));
}

function computeOperationColumnWidth(rows, rowActions, maxVisible) {
  if (!rowActions.length) return 0;

  const limit = maxVisible != null ? Math.max(0, maxVisible) : rowActions.length;
  const cellPadding = 12;
  const actionGap = 6;
  let maxWidth = 0;

  const measureRows = rows.length ? rows : [null];
  for (const row of measureRows) {
    const actions = row
      ? rowActions.filter((action) => !action.visibleWhen || action.visibleWhen(row))
      : rowActions;
    const visibleActions = limit ? actions.slice(0, limit) : actions;
    const overflow = limit ? actions.length > limit : false;
    const buttonsWidth = visibleActions.reduce((sum, action) => sum + estimateActionButtonWidth(action.label), 0);
    const visibleCount = visibleActions.length + (overflow ? 1 : 0);
    const gapsWidth = visibleCount > 1 ? (visibleCount - 1) * actionGap : 0;
    const moreWidth = overflow ? estimateActionButtonWidth('更多') + 12 : 0;
    maxWidth = Math.max(maxWidth, buttonsWidth + moreWidth + gapsWidth + cellPadding);
  }

  return Math.max(maxWidth, 72);
}

function RowActionsCell({ actions, row, onAction, maxVisible }) {
  if (!actions.length) return <span className="text-erp-text-muted">{EMPTY_PLACEHOLDER}</span>;

  const limit = maxVisible != null ? Math.max(0, maxVisible) : actions.length;
  const visibleActions = maxVisible != null ? actions.slice(0, limit) : actions;
  const overflowActions = maxVisible != null ? actions.slice(limit) : [];

  return (
    <div className="flex items-center justify-start gap-1.5 whitespace-nowrap text-[12px]">
      {visibleActions.map((action) => (
        <RowAction key={action.id} action={action} row={row} onAction={onAction} />
      ))}
      {overflowActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="text"
              size="compact"
              className="h-7 gap-0.5 rounded-erp-control px-1 text-[12px] font-normal hover:bg-erp-primary-soft hover:text-erp-primary"
            >
              更多
              <ChevronDown className="h-3.5 w-3.5 text-erp-text-muted" strokeWidth={2} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {overflowActions.map((action) => (
              <OverflowRowAction key={action.id} action={action} row={row} onAction={onAction} />
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

function RowAction({ action, row, onAction }) {
  const disabled = action.disabledWhen?.(row) || false;
  const disabledTitle = disabled ? action.disabledTitle?.(row) : undefined;
  // 有 confirm 的行内操作由 ConfirmDialog 接管确认，触发按钮不再直接执行，避免“确认框 + 模块弹窗”同时弹出。
  const trigger = (
    <Button
      variant={action.variant || 'text'}
      size="compact"
      disabled={disabled}
      title={disabledTitle}
      className={cn(
        'h-7 gap-1 rounded-erp-control px-1 text-[12px] font-normal',
        action.variant === 'danger'
          ? 'text-erp-danger hover:bg-erp-danger/10 hover:text-erp-danger'
          : 'hover:bg-erp-primary-soft hover:text-erp-primary',
      )}
      onClick={action.confirm ? undefined : () => onAction?.(action.id, row)}
    >
      {action.label}
    </Button>
  );
  if (!action.confirm) return disabledTitle ? <span className="inline-flex" title={disabledTitle}>{trigger}</span> : trigger;
  return <ConfirmDialog trigger={trigger} title={action.confirm.title} description={action.confirm.description} confirmLabel={action.confirm.confirmLabel || '确认'} confirmVariant={action.confirm.confirmVariant || 'primary'} onConfirm={() => onAction?.(action.id, row)} />;
}

function OverflowRowAction({ action, row, onAction }) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const disabled = action.disabledWhen?.(row) || false;
  const disabledTitle = disabled ? action.disabledTitle?.(row) : undefined;
  const danger = action.variant === 'danger' || action.confirm?.confirmVariant === 'danger';

  if (!action.confirm) {
    return (
      <DropdownMenuItem disabled={disabled} title={disabledTitle} onSelect={() => onAction?.(action.id, row)}>
        {action.label}
      </DropdownMenuItem>
    );
  }

  return (
    <>
      <DropdownMenuItem
        disabled={disabled}
        title={disabledTitle}
        className={danger ? 'text-erp-danger data-[highlighted]:text-erp-danger' : undefined}
        onSelect={() => setConfirmOpen(true)}
      >
        {action.label}
      </DropdownMenuItem>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={action.confirm.title}
        description={action.confirm.description}
        confirmLabel={action.confirm.confirmLabel || '确认'}
        confirmVariant={action.confirm.confirmVariant || 'primary'}
        onConfirm={() => {
          onAction?.(action.id, row);
          setConfirmOpen(false);
        }}
      />
    </>
  );
}
