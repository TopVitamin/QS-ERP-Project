import { cn } from '../../lib/utils.js';

export function InnerTabs({ items = [], value = '', onChange, className }) {
  return (
    <div
      role="tablist"
      aria-label="页面内切换"
      className={cn('no-scrollbar flex h-10 shrink-0 items-stretch gap-3 overflow-x-auto bg-erp-surface-panel px-1 pb-px shadow-[inset_0_-1px_0_rgb(var(--erp-border-default))]', className)}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap px-3 text-[12px] transition-colors',
              active
                ? 'font-semibold text-erp-primary'
                : 'text-erp-text hover:bg-erp-surface-muted hover:text-erp-primary',
            )}
            onClick={() => onChange?.(item.value)}
          >
            <span>{item.label}</span>
            {item.count != null && (
              <span className={cn('text-[11px]', active ? 'text-erp-primary' : 'text-erp-text-muted')}>({item.count})</span>
            )}
            <span className={cn('absolute inset-x-2 -bottom-px h-0.5 rounded-full', active ? 'bg-erp-primary' : 'bg-transparent')} />
          </button>
        );
      })}
    </div>
  );
}
