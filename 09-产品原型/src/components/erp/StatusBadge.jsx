import { cn } from '../../lib/utils.js';
import { typography } from '../../styles/typography.js';

const toneClassNames = {
  success: 'bg-erp-success-bg text-erp-success',
  warning: 'bg-erp-warning-bg text-erp-warning',
  danger: 'bg-erp-danger-bg text-erp-danger',
  info: 'bg-erp-info-bg text-erp-info',
  neutral: 'bg-erp-surface-muted text-erp-text-muted',
};

export function StatusBadge({ children, className, tone = 'warning' }) {
  if (!children) return null;

  return (
    <span className={cn('rounded-erp-status px-2 py-0.5', toneClassNames[tone] || toneClassNames.warning, typography.caption, className)}>
      {children}
    </span>
  );
}
