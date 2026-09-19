import { useState } from 'react';
import { EditorCard } from './DocumentEditorFrame.jsx';
import { detailTabListClassName, detailTabPanelClassName, detailTabSectionClassName } from './detailTabSection.js';
import { InnerTabs } from './InnerTabs.jsx';
import { StatusBadge } from './StatusBadge.jsx';
import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const theadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row last:border-b-0';
const tdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';
const tableShellClassName = 'overflow-hidden rounded border border-erp-border-table-row';

function RelatedDocumentTable({ columns, rows, emptyText, onOpenPage }) {
  if (!rows.length) {
    return (
      <div className={cn(tableShellClassName, 'flex min-h-[120px] items-center justify-center bg-erp-surface-panel text-[12px] text-erp-text-muted')}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={tableShellClassName}>
      <div className="table-scroll overflow-x-auto">
      <table className={tableClassName}>
        <thead className={theadClassName}>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(thClassName, column.align === 'right' && 'text-right')}
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-erp-surface-panel text-erp-text">
          {rows.map((row) => (
            <tr key={row.id} className={cn(rowClassName, 'bg-erp-surface-panel hover:bg-erp-surface-hover')}>
              {columns.map((column) => {
                const rawValue = column.render ? column.render(row) : row[column.key];
                const content = column.link && rawValue && rawValue !== EMPTY_PLACEHOLDER
                  ? (
                    <button
                      type="button"
                      className="truncate text-erp-primary hover:underline"
                      onClick={() => onOpenPage?.(column.pageId, { row: column.resolveRow?.(row) || row })}
                    >
                      {rawValue}
                    </button>
                  )
                  : column.badge
                    ? <StatusBadge tone={column.badgeTone?.(row)}>{rawValue}</StatusBadge>
                    : rawValue ?? EMPTY_PLACEHOLDER;

                return (
                  <td
                    key={column.key}
                    className={cn(
                      tdClassName,
                      column.align === 'right' && 'text-right',
                      column.muted && 'text-erp-text-muted',
                    )}
                  >
                    <div className="truncate">{content}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/**
 * 单据详情「关联单据」分组：Tab 切换不同下游单据简表。
 */
export function RelatedDocumentsCard({ sections, onOpenPage }) {
  const [activeTab, setActiveTab] = useState(sections?.[0]?.key || '');
  if (!sections?.length) return null;

  const activeSection = sections.find((section) => section.key === activeTab) || sections[0];
  const tabItems = sections.map((section) => ({
    value: section.key,
    label: section.title,
    count: section.rows?.length ?? 0,
  }));

  return (
    <EditorCard title="关联单据">
      <div className={detailTabSectionClassName}>
        <InnerTabs
          variant="pill"
          className={detailTabListClassName}
          items={tabItems}
          value={activeSection.key}
          onChange={setActiveTab}
        />
        <div className={detailTabPanelClassName}>
          <RelatedDocumentTable
            columns={activeSection.columns}
            rows={activeSection.rows || []}
            emptyText={activeSection.emptyText}
            onOpenPage={onOpenPage}
          />
        </div>
      </div>
    </EditorCard>
  );
}
