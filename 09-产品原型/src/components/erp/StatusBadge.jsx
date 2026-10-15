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

/** 页头状态标签组：statuses 优先，回退到单个 status 文案；全空不渲染。 */
export function StatusBadgeList({ statuses, status }) {
  const items = statuses?.length
    ? statuses
    : status
      ? [{ label: status }]
      : [];

  if (!items.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {items.map((item, index) => (
        <StatusBadge key={`${index}-${item.label ?? ''}`} tone={item.tone}>{item.label}</StatusBadge>
      ))}
    </div>
  );
}
