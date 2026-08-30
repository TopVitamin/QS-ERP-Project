import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Checkbox } from './checkbox.jsx';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from './command.jsx';
import { FieldAffordance, FieldTrigger } from './field.jsx';
import { Popover, PopoverContent, PopoverTrigger } from './popover.jsx';
import { cn } from '../../lib/utils.js';

function getOptionLabel(options, value) {
  return options.find((option) => option.value === value)?.label;
}

function getSelectableOptions(options) {
  return options.filter((option) => option.value);
}

export function Combobox({
  options = [],
  value = '',
  onValueChange,
  placeholder = '请选择',
  searchPlaceholder = '搜索选项',
  emptyText = '没有匹配项',
  clearable = true,
  disabled = false,
  ariaLabel,
  className,
  textSize = 'compact',
}) {
  const [open, setOpen] = useState(false);
  const selectableOptions = getSelectableOptions(options);
  const selectedLabel = getOptionLabel(selectableOptions, value);
  const hasValue = Boolean(value);

  function selectValue(nextValue) {
    onValueChange?.(nextValue);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FieldTrigger
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          hasValue={hasValue}
          textSize={textSize}
          className={cn('justify-between', className)}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <FieldAffordance
            hasValue={hasValue}
            clearable={clearable}
            disabled={disabled}
            clearAriaLabel="清除选择"
            showClearOnHover
            onClear={() => onValueChange?.('')}
          />
        </FieldTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {selectableOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value} ${option.keywords || ''}`}
                  onSelect={() => selectValue(option.value)}
                >
                  <Check className={cn('mr-2 size-3.5 text-erp-primary', value === option.value ? 'opacity-100' : 'opacity-0')} strokeWidth={2.2} />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export const SearchableSelect = Combobox;

export function MultiSelect({
  options = [],
  value = [],
  onValueChange,
  placeholder = '请选择',
  searchPlaceholder = '搜索选项',
  emptyText = '没有匹配项',
  clearable = true,
  disabled = false,
  ariaLabel,
  className,
  textSize = 'compact',
}) {
  const [open, setOpen] = useState(false);
  const selectableOptions = getSelectableOptions(options);
  const selectedValues = Array.isArray(value) ? value : [];
  const selectedOptions = useMemo(
    () => selectableOptions.filter((option) => selectedValues.includes(option.value)),
    [selectableOptions, selectedValues],
  );
  const selectedLabel = selectedOptions.length <= 2
    ? selectedOptions.map((option) => option.label).join('、')
    : `${selectedOptions[0]?.label} 等${selectedOptions.length}项`;
  const hasValue = selectedOptions.length > 0;

  function toggleValue(nextValue) {
    const nextValues = selectedValues.includes(nextValue)
      ? selectedValues.filter((item) => item !== nextValue)
      : [...selectedValues, nextValue];
    onValueChange?.(nextValues);
  }

  const allValues = selectableOptions.map((option) => option.value);
  const allSelected = allValues.length > 0 && allValues.every((optionValue) => selectedValues.includes(optionValue));
  const someSelected = selectedValues.some((selectedValue) => allValues.includes(selectedValue));

  function toggleAll() {
    onValueChange?.(allSelected ? [] : allValues);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <FieldTrigger
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          hasValue={hasValue}
          textSize={textSize}
          className={cn('justify-between', className)}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <FieldAffordance
            hasValue={hasValue}
            clearable={clearable}
            disabled={disabled}
            clearAriaLabel="清除全部选择"
            showClearOnHover
            onClear={() => onValueChange?.([])}
          />
        </FieldTrigger>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {selectableOptions.map((option) => {
                const checked = selectedValues.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value} ${option.keywords || ''}`}
                    onSelect={() => toggleValue(option.value)}
                    aria-selected={checked}
                  >
                    <Checkbox
                      checked={checked}
                      className="mr-2 pointer-events-none"
                      aria-hidden="true"
                      tabIndex={-1}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="shrink-0 border-t border-erp-border-light bg-erp-surface-panel p-1">
            <div
              role="button"
              tabIndex={selectableOptions.length > 0 ? 0 : -1}
              aria-disabled={selectableOptions.length === 0}
              className="flex h-8 items-center rounded-erp-control px-2 text-[12px] outline-none transition-colors hover:bg-erp-primary-soft focus-visible:bg-erp-primary-soft aria-disabled:pointer-events-none aria-disabled:opacity-45"
              onClick={toggleAll}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleAll();
                }
              }}
            >
              <Checkbox
                checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                className="pointer-events-none mr-2"
                aria-hidden="true"
                tabIndex={-1}
              />
              <span className="font-medium text-erp-text-section">全选</span>
              <span className="ml-2 text-erp-text-muted">已选 <span className="font-medium text-erp-primary">{selectedOptions.length}</span> 项</span>
            </div>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
