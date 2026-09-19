import { ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu.jsx';
import { FormField } from '../ui/form-field.jsx';
import { typography } from '../../styles/typography.js';
import { cn } from '../../lib/utils.js';
import { FilterControl } from './FilterControl.jsx';

function FilterToggle({ children, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1 text-[12px] text-erp-primary transition-colors hover:text-erp-primary-hover',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function ListPageHeader({ title, actions = [], filters = [], filterValues, onFilterChange, onReset, onQuery, onAction, actionContext, defaultOpen = true }) {
  const [filtersOpen, setFiltersOpen] = useState(defaultOpen);

  function updateFilter(key, value) {
    onFilterChange?.(key, value);
  }

  function renderAction(action) {
    if (action.render) return <span key={action.id}>{action.render(actionContext)}</span>;
    const Icon = action.icon;
    const actionButton = (
      <Button
        variant={action.variant || 'outline'}
        size="compact"
        disabled={action.disabled}
        onClick={() => onAction?.(action.id)}
        aria-label={action.ariaLabel || action.label}
      >
        {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />}
        <span>{action.label}</span>
        {action.menuItems && <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />}
      </Button>
    );

    if (!action.menuItems) return <span key={action.id}>{actionButton}</span>;

    return (
      <DropdownMenu key={action.id}>
        <DropdownMenuTrigger asChild>{actionButton}</DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {action.menuItems.map((item) => (
            <DropdownMenuItem key={item.id} onSelect={() => onAction?.(item.id)}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <section className="shrink-0 bg-erp-surface-panel text-erp-text">
      <div className="flex h-12 items-center justify-between border-b border-erp-border-header px-4">
        <div className="flex min-w-0 items-center gap-3">
          <h1 className={cn('truncate', typography.pageTitle)}>{title}</h1>
          {!filtersOpen && (
            <FilterToggle onClick={() => setFiltersOpen(true)}>
              <Filter className="h-3.5 w-3.5" strokeWidth={1.9} />
              <span>展开过滤</span>
              <ChevronDown className="h-3.5 w-3.5" strokeWidth={1.9} />
            </FilterToggle>
          )}
        </div>
        <div className="flex items-center gap-2">{actions.map(renderAction)}</div>
      </div>

      {filtersOpen && (
        <div className="px-4 py-3">
          <div className="grid grid-cols-6 gap-x-5 gap-y-3">
            {filters.map((field) => (
              <FormField key={field.key} label={field.label}>
                <FilterControl
                  field={field}
                  value={filterValues?.[field.key] ?? (field.type === 'multi-select' ? [] : '')}
                  onChange={(value) => updateFilter(field.key, value)}
                />
              </FormField>
            ))}
          </div>
        </div>
      )}

      {filtersOpen && (
        <div className="flex h-10 items-center justify-between px-4 text-[12px]">
          <FilterToggle onClick={() => setFiltersOpen(false)}>
            <Filter className="h-3.5 w-3.5" strokeWidth={1.9} />
            <span>收起过滤</span>
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={1.9} />
          </FilterToggle>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="compact" onClick={onReset}>重置</Button>
            <Button variant="primary" size="compact" onClick={onQuery}>查询</Button>
          </div>
        </div>
      )}
    </section>
  );
}
