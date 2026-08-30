import { formatAmount } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

function alignClassName(align) {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
}

function normalizeSummaryItem(item) {
  if (item === undefined || item === null) return null;
  if (typeof item === 'object') return item;
  return { value: item };
}

function formatSummaryValue(item) {
  const value = item.format === 'amount' ? formatAmount(item.value) : item.value;
  return `${item.prefix || ''}${value ?? ''}${item.suffix || ''}`;
}

export function DocumentSummaryBar({ columns, summary = {}, label = '合计' }) {
  return (
    <tfoot className="text-erp-compact text-erp-text-muted">
      <tr className="h-8 border-t border-erp-border-header bg-erp-surface-summary">
        {columns.map((column, index) => {
          const item = normalizeSummaryItem(summary[column.key]);
          return (
            <td key={column.key} className={cn('border-r border-erp-border-table-column px-2 align-middle last:border-r-0', alignClassName(column.align))}>
              {index === 0 && <span className="font-medium text-erp-text-section">{label}</span>}
              {item && (
                <span className="inline-flex w-full items-center justify-end">
                  <span className="sr-only">{item.label || column.label}</span>
                  <strong
                    className={cn(
                      'font-medium text-erp-text-section',
                      item.emphasis && 'font-semibold',
                    )}
                    title={item.label || column.label}
                  >
                    {formatSummaryValue(item)}
                  </strong>
                </span>
              )}
            </td>
          );
        })}
      </tr>
    </tfoot>
  );
}
