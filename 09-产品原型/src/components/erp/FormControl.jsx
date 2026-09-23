import { Fragment } from 'react';
import { formatFormDate, parseFormDate } from '../../lib/formDate.js';
import { cn } from '../../lib/utils.js';
import { CnAddressDetailInput, CnRegionPicker, CustomerAddressSelect } from './CnAddressFields.jsx';
import { fieldInvalidClassName } from '../ui/field.jsx';
import { DatePicker } from '../ui/date-picker.jsx';
import { FormField } from '../ui/form-field.jsx';
import { Input } from '../ui/input.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { SelectField } from '../ui/select-field.jsx';
import { Switch } from '../ui/switch.jsx';
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

  if (field.type === 'cn-region') {
    const savedAddressOptions = typeof field.savedAddressOptions === 'function'
      ? field.savedAddressOptions(form)
      : (field.savedAddressOptions || []);
    return (
      <CnRegionPicker
        value={value}
        onChange={onChange}
        disabled={typeof field.disabled === 'function' ? field.disabled(form) : field.disabled}
        invalid={invalid}
        savedAddressOptions={savedAddressOptions}
      />
    );
  }

  if (field.type === 'cn-address-detail') {
    return (
      <CnAddressDetailInput
        value={value}
        onChange={onChange}
        disabled={typeof field.disabled === 'function' ? field.disabled(form) : field.disabled}
        invalid={invalid}
        placeholder={field.detailPlaceholder || '请输入详细地址'}
      />
    );
  }

  if (field.type === 'customer-address') {
    const options = typeof field.addressOptions === 'function'
      ? field.addressOptions(form)
      : (field.addressOptions || []);
    return (
      <CustomerAddressSelect
        value={value}
        onChange={onChange}
        options={options}
        disabled={typeof field.disabled === 'function' ? field.disabled(form) : field.disabled}
        invalid={invalid}
        placeholder={field.placeholder || '请选择发货地址'}
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

  if (field.type === 'switch') {
    const disabled = typeof field.disabled === 'function' ? field.disabled(form) : field.disabled;
    return (
      <div className="flex h-7 items-center">
        <Switch
          checked={Boolean(value)}
          onCheckedChange={onChange}
          aria-label={ariaLabel}
          disabled={disabled}
        />
      </div>
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
    const disabled = typeof field.disabled === 'function' ? field.disabled(form) : field.disabled;

    if (field.type === 'cn-address') {
      const savedAddressOptions = typeof field.savedAddressOptions === 'function'
        ? field.savedAddressOptions(form)
        : (field.savedAddressOptions || []);
      const detailClassName = field.detailClassName || 'col-span-2';
      const detailLabel = field.detailLabel || '详细地址';

      return (
        <Fragment key={field.key}>
          <FormField
            label={field.label}
            required={field.required}
            className={field.className}
            fieldKey={field.key}
            error={error}
          >
            <CnRegionPicker
              value={form[field.key]}
              onChange={handleChange}
              disabled={disabled}
              invalid={Boolean(error)}
              savedAddressOptions={savedAddressOptions}
            />
          </FormField>
          <FormField
            label={detailLabel}
            required={field.required}
            className={detailClassName}
            fieldKey={`${field.key}-detail`}
          >
            <CnAddressDetailInput
              value={form[field.key]}
              onChange={handleChange}
              disabled={disabled}
              invalid={Boolean(error)}
              placeholder={field.detailPlaceholder || '请输入详细地址'}
            />
          </FormField>
        </Fragment>
      );
    }

    return (
      <FormField key={field.key} label={field.label} required={field.required} className={field.className} fieldKey={field.key} error={error}>
        <FormControl field={field} value={form[field.key]} form={form} onChange={handleChange} invalid={Boolean(error)} />
      </FormField>
    );
  });
}
