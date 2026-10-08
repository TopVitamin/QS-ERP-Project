import { Fragment } from 'react';
import { CircleHelp } from 'lucide-react';
import { formatFormDate, parseFormDate } from '../../lib/formDate.js';
import { cn } from '../../lib/utils.js';
import {
  CnAddressDetailInput,
  CnRegionPicker,
  CustomerAddressSelect,
  CustomerDeliveryAddressSelect,
} from './CnAddressFields.jsx';
import { isPresetCustomerAddress } from '../../lib/cnAddress.js';
import { fieldInvalidClassName } from '../ui/field.jsx';
import { DatePicker } from '../ui/date-picker.jsx';
import { FormField } from '../ui/form-field.jsx';
import { HintTooltip } from '../ui/tooltip.jsx';
import { Input } from '../ui/input.jsx';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group.jsx';
import { DocumentPickerField } from '../ui/document-picker-field.jsx';
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
    // 选项支持传函数：按当前表单值动态给选项（如其他出库申请单的「盘亏」只在出库仓为虚拟在途仓时可选）
    const options = typeof field.options === 'function' ? field.options(form) : (field.options || []);
    return (
      <SelectField
        options={options}
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

  if (field.type === 'document-picker') {
    const disabled = typeof field.disabled === 'function' ? field.disabled(form) : field.disabled;
    const displayValue = typeof field.getDisplayValue === 'function' ? field.getDisplayValue(form) : undefined;
    return (
      <DocumentPickerField
        value={value || ''}
        displayValue={displayValue}
        onPick={() => field.onPick?.(form)}
        onClear={() => onChange('')}
        placeholder={field.placeholder}
        ariaLabel={ariaLabel}
        disabled={disabled}
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
            {option.tip ? (
              <HintTooltip content={option.tip} side="top">
                <button
                  type="button"
                  className="inline-flex size-3.5 shrink-0 items-center justify-center text-erp-text-muted hover:text-erp-primary"
                  aria-label={`${option.label}说明`}
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                >
                  <CircleHelp className="size-3.5" strokeWidth={1.75} />
                </button>
              </HintTooltip>
            ) : null}
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
        maxLength={field.maxLength}
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
      type={field.type === 'number' ? 'number' : 'text'}
      value={field.type === 'number' ? value ?? '' : value || ''}
      onChange={(event) => onChange(event.target.value)}
      placeholder={field.placeholder}
      min={field.min}
      max={field.max}
      step={field.step}
      inputMode={field.inputMode}
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
    const hint = typeof field.hint === 'function' ? field.hint(form) : field.hint;

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

    if (field.type === 'customer-address-manual') {
      const addressOptions = typeof field.addressOptions === 'function'
        ? field.addressOptions(form)
        : (field.addressOptions || []);
      const addressValue = form[field.key];
      const showManualFields = !isPresetCustomerAddress(addressValue, addressOptions);
      const detailClassName = field.detailClassName || 'col-span-2';
      const regionLabel = field.regionLabel || '省/市/区 *';
      const detailLabel = field.detailLabel || '详细地址';

      return (
        <Fragment key={field.key}>
          <FormField
            label={field.label}
            required={field.required}
            className={field.className || 'col-span-2'}
            fieldKey={field.key}
            error={showManualFields ? undefined : error}
          >
            <CustomerDeliveryAddressSelect
              value={addressValue}
              onChange={handleChange}
              options={addressOptions}
              disabled={disabled}
              invalid={Boolean(error) && !showManualFields}
              placeholder={field.placeholder || '请选择客户地址'}
            />
          </FormField>
          {showManualFields ? (
            <>
              <FormField
                label={regionLabel}
                required={field.required}
                className={field.regionClassName}
                fieldKey={`${field.key}-region`}
                error={error}
              >
                <CnRegionPicker
                  value={addressValue}
                  onChange={handleChange}
                  disabled={disabled}
                  invalid={Boolean(error)}
                />
              </FormField>
              <FormField
                label={detailLabel}
                required={field.required}
                className={detailClassName}
                fieldKey={`${field.key}-detail`}
                error={error}
              >
                <CnAddressDetailInput
                  value={addressValue}
                  onChange={handleChange}
                  disabled={disabled}
                  invalid={Boolean(error)}
                  placeholder={field.detailPlaceholder || '请输入详细地址'}
                />
              </FormField>
            </>
          ) : null}
        </Fragment>
      );
    }

    return (
      <FormField key={field.key} label={field.label} required={field.required} className={field.className} fieldKey={field.key} error={error} hint={hint}>
        <FormControl field={field} value={form[field.key]} form={form} onChange={handleChange} invalid={Boolean(error)} />
      </FormField>
    );
  });
}
