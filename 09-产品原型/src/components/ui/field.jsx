import { ChevronDown, X } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../../lib/utils.js';
import { getFieldSizeTokens } from '../../styles/typography.js';

const fieldControlShellClassName =
  'flex w-full min-w-0 items-center gap-2 rounded-erp-control border border-erp-border-control bg-erp-surface-panel px-2.5 text-left outline-none transition-colors hover:border-erp-primary/70 focus-visible:border-erp-primary focus-visible:ring-1 focus-visible:ring-erp-primary/15 aria-expanded:border-erp-primary data-[state=open]:border-erp-primary disabled:cursor-not-allowed disabled:border-erp-border-control disabled:bg-erp-surface-disabled disabled:opacity-100';

/** @param {'compact' | 'comfortable'} [size] */
export function getFieldControlClassName(size = 'compact') {
  const tokens = getFieldSizeTokens(size);
  return cn(fieldControlShellClassName, tokens.control);
}

export const fieldControlClassName = getFieldControlClassName('compact');
export const comfortableFieldControlClassName = getFieldControlClassName('comfortable');

const affordanceClassName =
  'absolute right-1.5 top-1 z-10 inline-flex size-5 items-center justify-center rounded-erp-control text-erp-text-subtle hover:bg-erp-primary-soft hover:text-erp-primary';

const localAffordanceButtonClassName =
  'inline-flex size-5 items-center justify-center rounded-erp-control text-erp-text-subtle hover:bg-erp-primary-soft hover:text-erp-primary';

/** 右侧交互区：选择框默认显示下拉箭头，hover 后再显示清除按钮。 */
export function FieldAffordance({
  hasValue = false,
  clearable = false,
  onClear,
  disabled = false,
  clearAriaLabel = '清除',
  showChevron = true,
  showClearOnHover = false,
  icon: Icon,
}) {
  if (hasValue && clearable && onClear) {
    if (showClearOnHover && !disabled) {
      return (
        <span className="group/affordance absolute right-1 top-1 z-10 inline-flex size-5 items-center justify-center">
          <button
            type="button"
            disabled={disabled}
            className={cn(
              localAffordanceButtonClassName,
              'pointer-events-none opacity-0 transition-opacity duration-100 group-hover/affordance:pointer-events-auto group-hover/affordance:opacity-100',
            )}
            aria-label={clearAriaLabel}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onClear(event);
            }}
          >
            <X className="size-3.5" strokeWidth={1.9} />
          </button>
          {showChevron && (
            <ChevronDown
              className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 shrink-0 text-erp-text-muted transition-opacity duration-100 group-hover/affordance:opacity-0"
              strokeWidth={2}
            />
          )}
        </span>
      );
    }

    return (
      <button
        type="button"
        disabled={disabled}
        className={affordanceClassName}
        aria-label={clearAriaLabel}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onClear(event);
        }}
      >
        <X className="size-3.5" strokeWidth={1.9} />
      </button>
    );
  }

  if (Icon) {
    return <Icon className="pointer-events-none absolute right-2 top-1.5 size-3.5 shrink-0 text-erp-text-subtle" strokeWidth={2} />;
  }

  if (showChevron) {
    return <ChevronDown className="pointer-events-none absolute right-2 top-1.5 size-3.5 shrink-0 text-erp-text-muted" strokeWidth={2} />;
  }

  return null;
}

export const FieldTrigger = forwardRef(function FieldTrigger(
  { className, hasValue = false, disabled = false, textSize = 'compact', children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled}
      className={cn(
        getFieldControlClassName(textSize),
        'relative pr-8',
        hasValue ? 'text-erp-text' : 'text-erp-placeholder',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});
