import { formatFormDate, parseFormDate } from '../../lib/formDate.js';
import { cn } from '../../lib/utils.js';
import { fieldInvalidClassName } from '../ui/field.jsx';
import { DatePicker } from '../ui/date-picker.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { Textarea } from '../ui/textarea.jsx';

export function FormControl({ field, value, form, onChange, invalid = false }) {
  const ariaLabel = field.ariaLabel || field.label.replace(/\s*\*$/, '');
  const invalidClassName = invalid ? fieldInvalidClassName : undefined;

  if (field.type === 'date') {
    return (
      <DatePicker
        value={parseFormDate(value)}
        onChange={(nextDate) => onChange(formatFormDate(nextDate))}
        ariaLabel={ariaLabel}
        invalid={invalid}
        className={invalidClassName}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <SelectField
        options={field.options || []}
        value={value || ''}
        onValueChange={onChange}
        placeholder={field.placeholder}
        ariaLabel={ariaLabel}
        disabled={typeof field.disabled === 'function' ? field.disabled(form) : field.disabled}
        invalid={invalid}
        className={invalidClassName}
      />
    );
  }

  if (field.type === 'radio') {
    const disabled = typeof field.disabled === 'function' ? field.disabled(form) : field.disabled;
    return (
      <RadioGroup
        value={value || ''}
        onValueChange={onChange}
        aria-label={ariaLabel}
        disabled={disabled}
        className={cn('h-7 gap-4', invalidClassName)}
      >
        {(field.options || []).filter((option) => option.value).map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-center gap-1.5 text-[12px]',
              disabled ? 'cursor-not-allowed text-erp-disabled' : 'cursor-pointer text-erp-text',
            )}
          >
            <RadioGroupItem value={option.value} aria-label={option.label} disabled={disabled} />
            <span>{option.label}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={invalidClassName}
      />
    );
  }

  if (field.type === 'disabled') {
    const displayValue = typeof field.getValue === 'function'
      ? field.getValue(form)
      : (field.value ?? value ?? field.fallbackValue ?? '');
    return <Input value={displayValue} disabled aria-label={ariaLabel} />;
  }

  return (
    <Input
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      disabled={typeof field.disabled === 'function' ? field.disabled(form) : field.disabled}
      aria-label={ariaLabel}
      aria-invalid={invalid || undefined}
      className={invalidClassName}
    />
  );
}

export function FormFields({ fields, form, onFieldChange, fieldErrors = {} }) {
  return fields.map((field) => {
    function handleChange(nextValue) {
      if (field.onValueChange) {
        field.onValueChange(nextValue, form, onFieldChange);
        return;
      }
      onFieldChange(field.key, nextValue);
    }

    const error = fieldErrors[field.key];

    return (
      <FormField key={field.key} label={field.label} required={field.required} className={field.className} fieldKey={field.key} error={error}>
        <FormControl field={field} value={form[field.key]} form={form} onChange={handleChange} invalid={Boolean(error)} />
      </FormField>
    );
  });
}
