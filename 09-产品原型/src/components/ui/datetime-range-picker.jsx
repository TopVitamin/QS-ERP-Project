import { format, setHours, setMinutes, setSeconds } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useState } from 'react';
import { Calendar } from './calendar.jsx';
import { FieldAffordance, FieldTrigger } from './field.jsx';
import { Popover, PopoverContent, PopoverTrigger } from './popover.jsx';
import { SelectField } from './select-field.jsx';
import { cn } from '../../lib/utils.js';
import { formatFormDateTime, parseFormDateTime } from '../../lib/formDate.js';

const pad = (value) => String(value).padStart(2, '0');
const hourOptions = Array.from({ length: 24 }, (_, index) => ({ value: pad(index), label: pad(index) }));
const minuteOptions = Array.from({ length: 60 }, (_, index) => ({ value: pad(index), label: pad(index) }));

const startOfDay = { hours: 0, minutes: 0, seconds: 0 };
const endOfDay = { hours: 23, minutes: 59, seconds: 59 };

function TimePart({ label, value, options, onChange, disabled }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <span className="shrink-0 text-[12px] text-erp-text-muted">{label}</span>
      <SelectField
        options={options}
        value={value}
        onValueChange={onChange}
        ariaLabel={label}
        placeholder="--"
        disabled={disabled}
      />
    </div>
  );
}

function withTime(date, time) {
  return setSeconds(setMinutes(setHours(date, time.hours), time.minutes), time.seconds);
}

/**
 * 日期＋时间范围选择：日历选日期范围 + 起止时/分/秒下拉，
 * 值统一为 `{ from: 'YYYY-MM-DD HH:mm:ss', to: 'YYYY-MM-DD HH:mm:ss' }`。
 * 只选日期时，起始补 00:00:00、结束补 23:59:59，符合「筛选按日期＋时间范围」的用法。
 */
export function DateTimeRangePicker({
  value,
  onChange,
  placeholder = '请选择日期时间范围',
  clearable = true,
  disabled = false,
  ariaLabel,
  className,
  textSize = 'compact',
}) {
  const [open, setOpen] = useState(false);
  const from = parseFormDateTime(value?.from);
  const to = parseFormDateTime(value?.to);
  const hasValue = Boolean(from || to);
  const label = from && to
    ? `${format(from, 'yyyy-MM-dd HH:mm:ss')}～${format(to, 'yyyy-MM-dd HH:mm:ss')}`
    : from ? `${format(from, 'yyyy-MM-dd HH:mm:ss')}～` : to ? `～${format(to, 'yyyy-MM-dd HH:mm:ss')}` : placeholder;

  function handleRangeSelect(range) {
    if (!range) {
      onChange?.({ from: '', to: '' });
      return;
    }
    onChange?.({
      from: range.from ? formatFormDateTime(withTime(range.from, from
        ? { hours: from.getHours(), minutes: from.getMinutes(), seconds: from.getSeconds() }
        : startOfDay)) : '',
      to: range.to ? formatFormDateTime(withTime(range.to, to
        ? { hours: to.getHours(), minutes: to.getMinutes(), seconds: to.getSeconds() }
        : endOfDay)) : '',
    });
  }

  function handleTimeChange(part, next) {
    const baseFrom = from || new Date();
    const baseTo = to || from || new Date();
    const nextFrom = part.startsWith('from')
      ? withTime(baseFrom, {
        hours: part === 'from-hour' ? Number(next) : baseFrom.getHours(),
        minutes: part === 'from-minute' ? Number(next) : baseFrom.getMinutes(),
        seconds: part === 'from-second' ? Number(next) : baseFrom.getSeconds(),
      })
      : baseFrom;
    const nextTo = part.startsWith('to')
      ? withTime(baseTo, {
        hours: part === 'to-hour' ? Number(next) : baseTo.getHours(),
        minutes: part === 'to-minute' ? Number(next) : baseTo.getMinutes(),
        seconds: part === 'to-second' ? Number(next) : baseTo.getSeconds(),
      })
      : baseTo;
    onChange?.({ from: formatFormDateTime(nextFrom), to: formatFormDateTime(nextTo) });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className="relative w-full">
        <PopoverTrigger asChild>
          <FieldTrigger disabled={disabled} aria-label={ariaLabel} hasValue={hasValue} textSize={textSize} className={cn('justify-between', className)}>
            <span className="truncate">{label}</span>
          </FieldTrigger>
        </PopoverTrigger>
        <FieldAffordance
          hasValue={hasValue}
          clearable={clearable}
          disabled={disabled}
          clearAriaLabel="清除日期时间范围"
          showChevron={!hasValue}
          onClear={() => onChange?.({ from: '', to: '' })}
        />
      </div>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          min={1}
          selected={hasValue ? { from, to } : undefined}
          defaultMonth={from}
          locale={zhCN}
          onSelect={handleRangeSelect}
        />
        <div className="space-y-2 border-t border-erp-border-light px-3 py-2">
          <div className="flex items-center gap-3">
            <span className="w-9 shrink-0 text-[12px] text-erp-text-muted">开始</span>
            <TimePart label="时" value={from ? pad(from.getHours()) : ''} options={hourOptions} disabled={!from} onChange={(next) => handleTimeChange('from-hour', next)} />
            <TimePart label="分" value={from ? pad(from.getMinutes()) : ''} options={minuteOptions} disabled={!from} onChange={(next) => handleTimeChange('from-minute', next)} />
            <TimePart label="秒" value={from ? pad(from.getSeconds()) : ''} options={minuteOptions} disabled={!from} onChange={(next) => handleTimeChange('from-second', next)} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-9 shrink-0 text-[12px] text-erp-text-muted">结束</span>
            <TimePart label="时" value={to ? pad(to.getHours()) : ''} options={hourOptions} disabled={!to} onChange={(next) => handleTimeChange('to-hour', next)} />
            <TimePart label="分" value={to ? pad(to.getMinutes()) : ''} options={minuteOptions} disabled={!to} onChange={(next) => handleTimeChange('to-minute', next)} />
            <TimePart label="秒" value={to ? pad(to.getSeconds()) : ''} options={minuteOptions} disabled={!to} onChange={(next) => handleTimeChange('to-second', next)} />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
