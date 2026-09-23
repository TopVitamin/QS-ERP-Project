import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { DataTable } from './DataTable.jsx';
import { sortCategoriesForTree } from '../../lib/auxiliaryLogic.js';

function buildVisibleTreeRows(rows, expandedIds) {
  const sorted = sortCategoriesForTree(rows);
  const byParent = new Map();
  for (const row of sorted) {
    const key = row.parentId || '';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(row);
  }

  const result = [];
  function walk(parentId = '', depth = 0) {
    for (const row of byParent.get(parentId) || []) {
      const hasChildren = (byParent.get(row.id) || []).length > 0;
      const expanded = expandedIds.has(row.id);
      result.push({ ...row, depth, hasChildren, expanded });
      if (hasChildren && expanded) walk(row.id, depth + 1);
    }
  }
  walk();
  return result;
}

export function CategoryTreeTable({
  rows,
  columns,
  expandedIds,
  onToggleExpand,
  selectedIds,
  onToggleRow,
  onToggleAll,
  rowActions,
  onRowAction,
  onCellClick,
  onFeedback,
  visibility,
  columnOrder,
  pinnedKeys,
}) {
  const visibleColumns = useMemo(() => {
    const byKey = new Map(columns.map((column) => [column.key, column]));
    const order = [
      ...columnOrder.filter((key) => pinnedKeys.includes(key)),
      ...columnOrder.filter((key) => !pinnedKeys.includes(key)),
    ];
    const list = order.map((key) => byKey.get(key)).filter(Boolean);
    for (const column of columns) {
      if (!order.includes(column.key)) list.push(column);
    }
    return list.filter((column) => visibility[column.key] !== false);
  }, [columns, columnOrder, pinnedKeys, visibility]);

  const displayRows = useMemo(() => buildVisibleTreeRows(rows, expandedIds), [rows, expandedIds]);

  const displayColumns = useMemo(() => visibleColumns.map((column) => {
    if (column.key !== 'name') return column;
    return {
      ...column,
      render: (value, row) => (
        <div className="flex items-center gap-1" style={{ paddingLeft: `${row.depth * 16}px` }}>
          {row.hasChildren ? (
            <button
              type="button"
              className="inline-flex h-5 w-5 items-center justify-center rounded text-erp-text-muted hover:bg-erp-surface-muted"
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand?.(row.id);
              }}
              aria-label={row.expanded ? '收起' : '展开'}
            >
              {row.expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : <span className="inline-block w-5" />}
          <span className="truncate">{value}</span>
        </div>
      ),
    };
  }), [visibleColumns, onToggleExpand]);

  return (
    <DataTable
      rows={displayRows}
      columns={displayColumns}
      selectedIds={selectedIds}
      onToggleRow={onToggleRow}
      onToggleAll={onToggleAll}
      rowActions={rowActions}
      onRowAction={onRowAction}
      onCellClick={onCellClick}
      onFeedback={onFeedback}
      emptyText="没有符合条件的记录，请调整筛选条件"
    />
  );
}

export function useCategoryExpandedState(rows) {
  const [expandedIds, setExpandedIds] = useState(() => new Set(rows.filter((row) => row.level === 1).map((row) => row.id)));

  function toggleExpand(id) {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function ensureAncestorsExpanded(filteredRows) {
    const next = new Set(expandedIds);
    for (const row of filteredRows) {
      if (row.parentId) next.add(row.parentId);
      if (row.level === 1) next.add(row.id);
    }
    setExpandedIds(next);
  }

  return { expandedIds, toggleExpand, ensureAncestorsExpanded, setExpandedIds };
}
