import { Plus, Trash2 } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { Switch } from '../ui/switch.jsx';

export function PartnerEditableTable({
  title,
  rows = [],
  columns,
  onAdd,
  onRemove,
  onChange,
  onPatch,
  onToggleDefault,
  defaultKey = 'isDefault',
  emptyLabel = '暂无明细，可点击添加',
  minTableWidth = 960,
}) {
  return (
    <div className="space-y-3 px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-erp-text-muted">{title}</span>
        <Button variant="outline" size="compact" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" strokeWidth={1.9} />
          添加行
        </Button>
      </div>
      {rows.length ? (
        <div className="table-scroll overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left text-[12px]" style={{ minWidth: minTableWidth }}>
            <thead className="h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section">
              <tr>
                {columns.map((column) => (
                  <th key={column.key} className="border-r border-erp-border-table-column px-2 font-normal last:border-r-0" style={{ width: column.width }}>{column.label}</th>
                ))}
                <th className="w-16 px-2 font-normal">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id} className="h-9 border-b border-erp-border-table-row">
                  {columns.map((column) => (
                    <td key={column.key} className="border-r border-erp-border-table-column px-1.5 align-middle last:border-r-0">
                      {column.renderCell ? (
                        column.renderCell({
                          row,
                          onChange: (key, value) => onChange(row.id, key, value),
                          onPatch: (patch) => onPatch?.(row.id, patch),
                        })
                      ) : column.type === 'select' ? (
                        <SelectField
                          value={row[column.key] || ''}
                          options={column.options || []}
                          placeholder={column.placeholder}
                          onValueChange={(value) => onChange(row.id, column.key, value)}
                        />
                      ) : column.type === 'switch' ? (
                        <div className="flex h-9 items-center">
                          <Switch
                            checked={Boolean(row[column.key])}
                            onCheckedChange={(checked) => onToggleDefault?.(row.id, checked)}
                            aria-label={column.label}
                          />
                        </div>
                      ) : (
                        <Input
                          value={row[column.key] || ''}
                          placeholder={column.placeholder}
                          onChange={(event) => onChange(row.id, column.key, event.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-1.5 align-middle">
                    <Button variant="ghost" size="compact" className="text-erp-danger" onClick={() => onRemove(row.id)}>
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-erp-control border border-dashed border-erp-border-light px-4 py-6 text-center text-[12px] text-erp-text-muted">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}
