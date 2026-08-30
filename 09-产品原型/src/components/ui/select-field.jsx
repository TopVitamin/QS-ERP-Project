import { FieldAffordance } from './field.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select.jsx';

export function getSelectableOptions(options = []) {
  return options.filter((option) => option.value !== '' && option.value != null);
}

export function SelectField({
  options = [],
  value = '',
  onValueChange,
  placeholder = '请选择',
  disabled = false,
  ariaLabel,
  className,
  textSize = 'compact',
  variant = 'underline',
}) {
  const selectableOptions = getSelectableOptions(options);
  const hasValue = value !== '' && value != null;

  return (
    <div className="group relative w-full">
      <Select
        value={hasValue ? String(value) : ''}
        onValueChange={onValueChange}
        disabled={disabled}
      >
        <SelectTrigger aria-label={ariaLabel} hideIcon={hasValue} textSize={textSize} variant={variant} className={className}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent align="start">
          {selectableOptions.map((option) => (
            <SelectItem key={String(option.value)} value={String(option.value)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hasValue ? (
        <FieldAffordance
          hasValue
          clearable
          disabled={disabled}
          clearAriaLabel="清除选择"
          showClearOnHover
          onClear={() => onValueChange?.('')}
        />
      ) : null}
    </div>
  );
}
