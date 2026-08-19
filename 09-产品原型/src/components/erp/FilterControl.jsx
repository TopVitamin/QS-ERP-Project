import { Search } from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { Combobox, MultiSelect } from '../ui/combobox.jsx';
import { DatePicker } from '../ui/date-picker.jsx';
import { ClearableInput } from '../ui/input.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SelectField } from '../ui/select-field.jsx';

function getSelectPlaceholder(field) {
  return field.placeholder || '请选择';
}

export function FilterControl({ field, value, onChange }) {
  const options = field.options || [];
  const selectPlaceholder = getSelectPlaceholder(field);

  if (field.type === 'date') {
    return (
      <DatePicker
        value={value ? parseISO(value) : undefined}
        onChange={(nextDate) => onChange(nextDate && isValid(nextDate) ? format(nextDate, 'yyyy-MM-dd') : '')}
        placeholder={field.placeholder || '请选择日期'}
        ariaLabel={field.label}
      />
    );
  }

  if (field.type === 'multi-select') {
    return (
      <MultiSelect
        value={Array.isArray(value) ? value : []}
        onValueChange={onChange}
        options={options}
        placeholder={selectPlaceholder}
        searchPlaceholder={`搜索${field.label}`}
        ariaLabel={field.label}
      />
    );
  }

  if (field.type === 'searchable-select') {
    return (
      <Combobox
        value={value || ''}
        onValueChange={onChange}
        options={options}
        placeholder={selectPlaceholder}
        searchPlaceholder={`搜索${field.label}`}
        ariaLabel={field.label}
      />
    );
  }

  if (field.type === 'select') {
    return (
      <SelectField
        value={value || ''}
        onValueChange={onChange}
        options={options}
        placeholder={selectPlaceholder}
        ariaLabel={field.label}
      />
    );
  }

  if (field.type === 'radio') {
    return (
      <RadioGroup value={value || ''} onValueChange={onChange} aria-label={field.label} className="h-7 gap-4">
        {options.filter((option) => option.value).map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-1.5 text-[12px] text-erp-text-muted">
            <RadioGroupItem value={option.value} aria-label={option.label} />
            <span>{option.label}</span>
          </label>
        ))}
      </RadioGroup>
    );
  }

  return (
    <ClearableInput
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onClear={() => onChange('')}
      aria-label={field.label}
      placeholder={field.placeholder}
      trailingIcon={field.type === 'search' ? Search : undefined}
    />
  );
}
