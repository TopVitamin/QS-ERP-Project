import { formatFormDate, parseFormDate } from '../../lib/formDate.js';
import { DatePicker } from '../ui/date-picker.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { Textarea } from '../ui/textarea.jsx';

export function FormControl({ field, value, form, onChange }) {
  const ariaLabel = field.ariaLabel || field.label.replace(/\s*\*$/, '');

  if (field.type === 'date') {
    return (
      <DatePicker
        value={parseFormDate(value)}
        onChange={(nextDate) => onChange(formatFormDate(nextDate))}
        ariaLabel={ariaLabel}
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
      />
    );
  }

  if (field.type === 'textarea') {
    return (
      <Textarea
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
      />
    );
  }

  if (field.type === 'disabled') {
    return <Input value={field.value ?? value ?? field.fallbackValue ?? ''} disabled />;
  }

  return (
    <Input
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      disabled={typeof field.disabled === 'function' ? field.disabled(form) : field.disabled}
    />
  );
}

export function FormFields({ fields, form, onFieldChange }) {
  return fields.map((field) => {
    function handleChange(nextValue) {
      if (field.onValueChange) {
        field.onValueChange(nextValue, form, onFieldChange);
        return;
      }
      onFieldChange(field.key, nextValue);
    }

    return (
      <FormField key={field.key} label={field.label} required={field.required} className={field.className}>
        <FormControl field={field} value={form[field.key]} form={form} onChange={handleChange} />
      </FormField>
    );
  });
}
