import { EMPTY_PLACEHOLDER } from '../../lib/format.js';
import { cn } from '../../lib/utils.js';
import { detailFieldTokens, getFieldSizeTokens, typography } from '../../styles/typography.js';

/** @param {string} label @param {boolean | undefined} required */
export function parseFieldLabel(label, required) {
  const hasSuffix = typeof label === 'string' && label.endsWith(' *');

  return {
    text: hasSuffix ? label.slice(0, -2) : label,
    required: required ?? hasSuffix,
  };
}

/** @param {{ label: string, required?: boolean }} props */
export function FieldLabelContent({ label, required }) {
  const { text, required: isRequired } = parseFieldLabel(label, required);

  return (
    <>
      <span className="truncate">{text}</span>
      {isRequired ? (
        <span className="ml-0.5 shrink-0 text-erp-danger" aria-hidden="true">
          *
        </span>
      ) : null}
    </>
  );
}

/** @param {{ label: string, required?: boolean, className?: string, htmlFor?: string, title?: string, size?: 'compact' | 'comfortable' }} props */
export function FieldLabel({ label, required, className, htmlFor, title, size = 'compact' }) {
  const tokens = getFieldSizeTokens(size);
  const { text, required: isRequired } = parseFieldLabel(label, required);
  const titleText = title ?? text;

  return (
    <label
      htmlFor={htmlFor}
      className={cn('flex min-w-0 items-center', tokens.labelHeight, tokens.label, className)}
      title={isRequired ? `${titleText}（必填）` : titleText}
    >
      <FieldLabelContent label={label} required={required} />
    </label>
  );
}

/** @param {{ label: string, required?: boolean, children: import('react').ReactNode, className?: string, htmlFor?: string, size?: 'compact' | 'comfortable', error?: string, fieldKey?: string }} props */
export function FormField({ label, required, children, className, htmlFor, size = 'compact', error, fieldKey }) {
  const tokens = getFieldSizeTokens(size);

  return (
    <div
      className={cn('flex min-w-0 flex-col', tokens.gap, 'text-erp-text', className)}
      data-field-key={fieldKey}
    >
      <FieldLabel label={label} required={required} htmlFor={htmlFor} size={size} />
      {children}
      {error ? (
        <p className="text-[12px] leading-4 text-erp-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Read-only label/value pair for detail pages. */
export function DetailField({ label, value, className = '' }) {
  const displayValue = value === undefined || value === null || value === '' ? EMPTY_PLACEHOLDER : value;

  return (
    <div className={cn('flex min-w-0 flex-col', detailFieldTokens.gap, typography.labelMuted, className)}>
      <div
        className={cn('flex min-w-0 items-center truncate', detailFieldTokens.labelHeight, detailFieldTokens.label)}
        title={label}
      >
        {label}
      </div>
      <div
        className={cn('flex min-w-0 items-center truncate text-erp-text', detailFieldTokens.value)}
        title={typeof displayValue === 'string' ? displayValue : undefined}
      >
        {displayValue}
      </div>
    </div>
  );
}
