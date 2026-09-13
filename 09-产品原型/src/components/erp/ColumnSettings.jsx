import { useMemo, useState } from 'react';
import { GripVertical, Pin, RotateCcw, Settings } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Checkbox } from '../ui/checkbox.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.jsx';
import { cn } from '../../lib/utils.js';

export function ColumnSettings({ options = [], visibility = {}, order = [], pinnedKeys = [], onToggle, onPin, onReorder, onReset }) {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [dragKey, setDragKey] = useState(null);

  const orderedOptions = useMemo(() => {
    const byKey = new Map(options.map((option) => [option.key, option]));
    const list = order.map((key) => byKey.get(key)).filter(Boolean);
    for (const option of options) {
      if (!order.includes(option.key)) list.push(option);
    }
    return list;
  }, [options, order]);

  const visibleCount = orderedOptions.filter((option) => visibility[option.key] !== false).length;
  const filteredOptions = keyword ? orderedOptions.filter((option) => option.label.includes(keyword)) : orderedOptions;

  function handleDragOver(event, targetKey) {
    event.preventDefault();
    if (!dragKey || dragKey === targetKey || keyword) return;
    const from = order.indexOf(dragKey);
    const to = order.indexOf(targetKey);
    if (from < 0 || to < 0) return;
    const next = [...order];
    next.splice(from, 1);
    next.splice(to, 0, dragKey);
    onReorder?.(next);
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setKeyword('');
          setDragKey(null);
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="text-erp-text-muted" aria-label="列设置" title="列设置">
          <Settings className="h-4 w-4" strokeWidth={1.8} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[264px] p-0">
        <div className="flex h-10 items-center justify-between border-b border-erp-border-header px-3">
          <span className="text-[13px] font-medium text-erp-text-title">列设置</span>
          <span className="text-[11px] text-erp-text-muted">已显示 {visibleCount}/{orderedOptions.length}</span>
        </div>

        <div className="border-b border-erp-border-light p-2">
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索列名称"
            aria-label="搜索列名称"
            className="h-7 w-full rounded-erp-control border border-erp-border-control bg-erp-surface-panel px-2 text-[12px] text-erp-text outline-none transition-colors placeholder:text-erp-placeholder focus-visible:border-erp-primary"
          />
        </div>

        <div className="max-h-[260px] overflow-y-auto p-1">
          {filteredOptions.length === 0 && (
            <div className="flex h-16 items-center justify-center text-[12px] text-erp-text-muted">没有匹配的列</div>
          )}
          {filteredOptions.map((option) => {
            const isVisible = visibility[option.key] !== false;
            const isPinned = pinnedKeys.includes(option.key);
            return (
              <div
                key={option.key}
                onDragOver={(event) => handleDragOver(event, option.key)}
                className={cn(
                  'group flex h-8 items-center gap-1.5 rounded-erp-control px-1 text-[12px] hover:bg-erp-surface-hover',
                  dragKey === option.key && 'bg-erp-primary-soft',
                )}
              >
                <span
                  draggable={!keyword}
                  onDragStart={() => setDragKey(option.key)}
                  onDragEnd={() => setDragKey(null)}
                  className={cn(
                    'flex h-6 w-5 shrink-0 items-center justify-center text-erp-text-placeholder',
                    keyword ? 'cursor-default opacity-40' : 'cursor-grab',
                  )}
                  aria-hidden="true"
                >
                  <GripVertical className="h-3.5 w-3.5" strokeWidth={1.8} />
                </span>
                <Checkbox
                  checked={isVisible}
                  onCheckedChange={(checked) => onToggle?.(option.key, checked === true)}
                  aria-label={`显示${option.label}`}
                />
                <span className="min-w-0 flex-1 truncate text-erp-text" title={option.label}>{option.label}</span>
                <button
                  type="button"
                  aria-label={isPinned ? `取消固定${option.label}` : `固定${option.label}`}
                  title={isPinned ? '取消固定' : '固定到左侧'}
                  className={cn(
                    'flex h-6 w-5 shrink-0 items-center justify-center rounded-erp-control',
                    isPinned ? 'text-erp-primary' : 'text-erp-text-placeholder opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                  )}
                  onClick={() => onPin?.(option.key)}
                >
                  <Pin className="h-3.5 w-3.5" strokeWidth={1.9} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-erp-border-header px-3 py-2">
          <span className="text-[11px] text-erp-text-muted">拖动排序，图钉固定左侧</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-[12px] text-erp-primary hover:text-erp-primary-hover"
            onClick={() => onReset?.()}
          >
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.9} />
            恢复默认
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
