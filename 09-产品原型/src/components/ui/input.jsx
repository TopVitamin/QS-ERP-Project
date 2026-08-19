import { cn } from '../../lib/utils.js';
import { FieldAffordance, getFieldControlClassName } from './field.jsx';

export function Input({ className, textSize = 'compact', ...props }) {
  return (
    <input
      className={cn(getFieldControlClassName(textSize), 'text-erp-text placeholder:text-erp-placeholder', className)}
      {...props}
    />
  );
}

export function ClearableInput({ value = '', onChange, onClear, trailingIcon, className, clearable = true, textSize = 'compact', ...props }) {
  const hasValue = Boolean(value);

  return (
    <div className="relative w-full">
      <Input
        {...props}
        value={value}
        onChange={onChange}
        textSize={textSize}
        className={cn('pr-8', className)}
      />
      <FieldAffordance
        hasValue={hasValue}
        clearable={clearable}
        clearAriaLabel="清除输入"
        showChevron={false}
        icon={!hasValue ? trailingIcon : undefined}
        onClear={onClear}
      />
    </div>
  );
}
