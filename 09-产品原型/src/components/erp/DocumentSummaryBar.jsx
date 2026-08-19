import { formatAmount } from '../../lib/format.js';

export function DocumentSummaryBar({ quantityLabel, quantity, amountLabel, amount }) {
  return (
    <div className="flex h-11 items-center justify-end gap-8 border-t border-erp-border-header bg-erp-surface-muted px-4 text-erp-compact text-erp-text-muted">
      <span>
        {quantityLabel}
        {' '}
        <strong className="ml-1 font-medium text-erp-text-section">{quantity}</strong>
      </span>
      <span>
        {amountLabel}
        {' '}
        <strong className="ml-1 text-erp-emphasis font-semibold text-erp-text-section">¥ {formatAmount(amount)}</strong>
      </span>
    </div>
  );
}
