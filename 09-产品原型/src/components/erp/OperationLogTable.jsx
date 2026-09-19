import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';

const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const theadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row last:border-b-0 bg-erp-surface-panel hover:bg-erp-surface-hover';
const tdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';
const tableShellClassName = 'overflow-hidden rounded border border-erp-border-table-row';

const columns = [
  { key: 'time', label: '操作时间', width: '168px' },
  { key: 'operator', label: '操作人', width: '96px' },
  { key: 'action', label: '操作类型', width: '96px' },
  { key: 'remark', label: '说明' },
];

export function OperationLogTable({ entries = [], emptyText = '暂无操作记录' }) {
  if (!entries.length) {
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
                className={thClassName}
                style={{ width: column.width }}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-erp-text">
          {entries.map((entry) => (
            <tr key={entry.id} className={rowClassName}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    tdClassName,
                    column.key === 'remark' && 'whitespace-normal',
                    column.key === 'remark' && entry.remark === EMPTY_PLACEHOLDER && 'text-erp-text-muted',
                  )}
                >
                  <div className={column.key === 'remark' ? 'py-1 leading-5' : 'truncate'}>
                    {entry[column.key] ?? EMPTY_PLACEHOLDER}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}
