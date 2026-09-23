import { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import {
  addressRecordToCnAddress,
  createEmptyCnAddress,
  findCustomerAddressById,
  formatCnRegion,
  getCities,
  getDistricts,
  getProvinces,
  normalizeAddressValue,
  searchCnRegions,
} from '../../lib/cnAddress.js';
import { cn } from '../../lib/utils.js';
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from '../ui/command.jsx';
import { FieldAffordance, FieldTrigger, fieldInvalidClassName } from '../ui/field.jsx';
import { Input } from '../ui/input.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.jsx';
import { SelectField } from '../ui/select-field.jsx';

function useCnAddressState(value, onChange) {
  const address = normalizeAddressValue(value);

  function patch(partial) {
    onChange({
      ...address,
      ...partial,
    });
  }

  return { address, patch };
}

const regionItemClassName =
  'relative flex min-h-8 w-full cursor-pointer select-none items-center rounded-erp-control px-2.5 py-1.5 pr-8 text-left text-[12px] outline-none transition-colors hover:bg-erp-primary-soft hover:text-erp-primary-hover';

function RegionColumn({
  title,
  options,
  value,
  onSelect,
  disabled = false,
  emptyText = '暂无数据',
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="border-b border-erp-border-light px-2.5 py-1.5 text-[11px] leading-4 text-erp-text-muted">
        {title}
      </div>
      <div className="flex max-h-64 flex-col gap-0.5 overflow-y-auto p-1.5">
        {disabled ? (
          <div className="px-2 py-8 text-center text-[12px] leading-5 text-erp-text-muted">{emptyText}</div>
        ) : options.length === 0 ? (
          <div className="px-2 py-8 text-center text-[12px] leading-5 text-erp-text-muted">{emptyText}</div>
        ) : (
          options.map((option) => {
            const selected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  regionItemClassName,
                  selected && 'bg-erp-primary-soft text-erp-primary-hover',
                )}
                onClick={() => onSelect(option.value)}
              >
                <span className="truncate">{option.label}</span>
                {selected ? (
                  <Check className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-erp-primary" strokeWidth={2.2} />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

/** 省市区三级联动，单输入框展示「省/市/区」，点击弹出级联面板。 */
export function CnRegionPicker({
  value,
  onChange,
  disabled = false,
  invalid = false,
  savedAddressOptions = [],
  placeholder = '请选择省市区',
  searchPlaceholder = '搜索省市区',
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { address, patch } = useCnAddressState(value, onChange);
  const provinces = useMemo(() => getProvinces(), []);
  const cities = useMemo(() => getCities(address.provinceCode), [address.provinceCode]);
  const districts = useMemo(
    () => getDistricts(address.provinceCode, address.cityCode),
    [address.provinceCode, address.cityCode],
  );
  const searchResults = useMemo(() => searchCnRegions(search), [search]);
  const regionText = formatCnRegion(address);
  const hasRegion = Boolean(regionText);
  const invalidClassName = invalid ? fieldInvalidClassName : undefined;
  const isSearching = Boolean(search.trim());

  useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
  }

  function handleSavedAddressChange(savedAddressId) {
    if (!savedAddressId) {
      patch(createEmptyCnAddress());
      return;
    }
    patch(addressRecordToCnAddress(findCustomerAddressById(savedAddressId)));
  }

  function clearRegion(event) {
    event.preventDefault();
    event.stopPropagation();
    patch({
      provinceCode: '',
      cityCode: '',
      districtCode: '',
      savedAddressId: '',
    });
  }

  function selectProvince(provinceCode) {
    patch({
      provinceCode,
      cityCode: '',
      districtCode: '',
      savedAddressId: '',
    });
  }

  function selectCity(cityCode) {
    patch({
      cityCode,
      districtCode: '',
      savedAddressId: '',
    });
  }

  function selectDistrict(districtCode) {
    patch({
      districtCode,
      savedAddressId: '',
    });
    setOpen(false);
  }

  function selectSearchResult(item) {
    patch({
      provinceCode: item.provinceCode,
      cityCode: item.cityCode,
      districtCode: item.districtCode,
      savedAddressId: '',
    });
    setSearch('');
    setOpen(false);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      {savedAddressOptions.length > 0 && (
        <SelectField
          options={[{ value: '', label: '手动填写' }, ...savedAddressOptions]}
          value={address.savedAddressId || ''}
          onValueChange={handleSavedAddressChange}
          placeholder="选用客户地址"
          ariaLabel="选用客户地址"
          disabled={disabled}
          invalid={invalid}
          className={invalidClassName}
        />
      )}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <div className="group relative w-full">
          <PopoverTrigger asChild>
            <FieldTrigger
              role="combobox"
              aria-expanded={open}
              aria-label="省市区"
              aria-invalid={invalid || undefined}
              disabled={disabled}
              hasValue={hasRegion}
              className={cn('justify-between', invalidClassName)}
            >
              <span className="truncate text-left">{regionText || placeholder}</span>
            </FieldTrigger>
          </PopoverTrigger>
          {hasRegion ? (
            <FieldAffordance
              hasValue
              clearable
              disabled={disabled}
              clearAriaLabel="清除省市区"
              showClearOnHover
              onClear={clearRegion}
            />
          ) : null}
        </div>
        <PopoverContent align="start" className="w-[min(520px,calc(100vw-24px))] p-0">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
              wrapperClassName="h-9 px-3"
            />
            {isSearching ? (
              <CommandList className="max-h-72 p-1.5">
                <CommandEmpty className="py-8 leading-5">没有匹配的省市区</CommandEmpty>
                {searchResults.map((item) => {
                  const selected = address.provinceCode === item.provinceCode
                    && address.cityCode === item.cityCode
                    && address.districtCode === item.districtCode;

                  return (
                    <CommandItem
                      key={`${item.provinceCode}-${item.cityCode}-${item.districtCode}`}
                      value={item.label}
                      className="min-h-8 px-2.5 py-1.5"
                      onSelect={() => selectSearchResult(item)}
                    >
                      <Check
                        className={cn('mr-2 size-3.5 shrink-0 text-erp-primary', selected ? 'opacity-100' : 'opacity-0')}
                        strokeWidth={2.2}
                      />
                      <span className="truncate leading-5">{item.label}</span>
                    </CommandItem>
                  );
                })}
              </CommandList>
            ) : (
              <div className="flex divide-x divide-erp-border-light">
                <RegionColumn
                  title="省"
                  options={provinces}
                  value={address.provinceCode}
                  onSelect={selectProvince}
                  emptyText="暂无省份"
                />
                <RegionColumn
                  title="市"
                  options={cities}
                  value={address.cityCode}
                  onSelect={selectCity}
                  disabled={!address.provinceCode}
                  emptyText="请先选省"
                />
                <RegionColumn
                  title="区县"
                  options={districts}
                  value={address.districtCode}
                  onSelect={selectDistrict}
                  disabled={!address.cityCode}
                  emptyText="请先选市"
                />
              </div>
            )}
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** 详细地址输入，通常占 2 列栅格。 */
export function CnAddressDetailInput({
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = '请输入详细地址',
}) {
  const { address, patch } = useCnAddressState(value, onChange);
  const invalidClassName = invalid ? fieldInvalidClassName : undefined;

  return (
    <Input
      value={address.detailAddress || ''}
      onChange={(event) => patch({
        detailAddress: event.target.value,
        savedAddressId: '',
      })}
      placeholder={placeholder}
      aria-label="详细地址"
      aria-invalid={invalid || undefined}
      disabled={disabled}
      className={invalidClassName}
    />
  );
}

/** 从客户地址明细单选，用于发货通知单等只允许选已维护地址的场景。 */
export function CustomerAddressSelect({
  value,
  onChange,
  options = [],
  disabled = false,
  invalid = false,
  placeholder = '请选择发货地址',
}) {
  const address = normalizeAddressValue(value);
  const selectedId = address.savedAddressId
    || options.find((option) => {
      const record = findCustomerAddressById(option.value);
      return record
        && record.provinceCode === address.provinceCode
        && record.cityCode === address.cityCode
        && record.districtCode === address.districtCode
        && String(record.detailAddress || '').trim() === String(address.detailAddress || '').trim();
    })?.value
    || '';
  const invalidClassName = invalid ? fieldInvalidClassName : undefined;

  function handleChange(savedAddressId) {
    if (!savedAddressId) {
      onChange(createEmptyCnAddress());
      return;
    }
    onChange(addressRecordToCnAddress(findCustomerAddressById(savedAddressId)));
  }

  return (
    <SelectField
      options={options}
      value={selectedId}
      onValueChange={handleChange}
      placeholder={placeholder}
      ariaLabel="发货地址"
      disabled={disabled}
      invalid={invalid}
      className={invalidClassName}
    />
  );
}

/** @deprecated 请通过 FormControl/FormFields 的 cn-address 类型使用分列布局。 */
export function CnAddressFields(props) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <CnRegionPicker {...props} />
      <CnAddressDetailInput {...props} />
    </div>
  );
}
