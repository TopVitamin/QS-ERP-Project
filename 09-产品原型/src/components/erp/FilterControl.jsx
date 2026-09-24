import { format, isValid, parseISO } from 'date-fns';
import { Checkbox } from '../ui/checkbox.jsx';
import { Combobox, MultiSelect } from '../ui/combobox.jsx';
import { DatePicker } from '../ui/date-picker.jsx';
import { DateRangePicker } from '../ui/date-range-picker.jsx';
import { DateTimeRangePicker } from '../ui/datetime-range-picker.jsx';
import { ClearableInput } from '../ui/input.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SelectField } from '../ui/select-field.jsx';

function getSelectPlaceholder(field) {
  return field.placeholder || '请选择';
}

export function FilterControl({ field, value, onChange }) {
  const options = field.options || [];
  const selectPlaceholder = getSelectPlaceholder(field);

  // 勾选框：标签由 ListPageHeader 的 FormField 提供，这里只画控件，保持栅格标签在上的对齐。
  if (field.type === 'checkbox') {
    return (
      <div className="flex h-7 items-center">
        <Checkbox
          checked={Boolean(value)}
          onCheckedChange={(checked) => onChange(checked === true)}
          aria-label={field.label}
        />
      </div>
    );
  }

  if (field.type === 'datetime-range') {
    return (
      <DateTimeRangePicker
        value={value && typeof value === 'object' ? value : { from: '', to: '' }}
        onChange={onChange}
        placeholder={field.placeholder || '不限'}
        ariaLabel={field.label}
      />
    );
  }

  if (field.type === 'date-range') {
    return (
      <DateRangePicker
        value={value && typeof value === 'object' ? value : { from: '', to: '' }}
        onChange={onChange}
        placeholder={field.placeholder || '请选择日期范围'}
        ariaLabel={field.label}
      />
    );
  }

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
    />
  );
}
