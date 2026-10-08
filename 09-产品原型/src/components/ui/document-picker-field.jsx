import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils.js';
import { FieldAffordance, getFieldControlClassName } from './field.jsx';

/** 关联单据选择：点击打开模块弹窗，不展开下拉列表；有值时右侧可清除。 */
export function DocumentPickerField({
  value = '',
  displayValue,
  onPick,
  onClear,
  placeholder = '请选择',
  disabled = false,
  ariaLabel,
  className,
  invalid = false,
}) {
  const hasValue = value !== '' && value != null;
  const text = hasValue ? (displayValue ?? value) : placeholder;

  return (
    <div className="group relative w-full">
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        onClick={() => {
          if (!disabled) onPick?.();
        }}
        className={cn(
          getFieldControlClassName('compact', 'underline'),
          'relative w-full justify-between pr-8 text-left',
          !hasValue ? 'text-erp-placeholder' : 'text-erp-text',
          disabled && 'cursor-not-allowed',
          className,
        )}
      >
        <span className="line-clamp-1 flex-1">{text}</span>
      </button>
      {hasValue ? (
        <FieldAffordance
          hasValue
          clearable
          disabled={disabled}
          clearAriaLabel="清除选择"
          showClearOnHover
          showChevron
          onClear={() => onClear?.()}
        />
      ) : (
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1.5 h-3.5 w-3.5 shrink-0 text-erp-text-muted"
          strokeWidth={2}
        />
      )}
    </div>
  );
}
