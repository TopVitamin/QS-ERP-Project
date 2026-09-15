import { StatusBadge } from '../components/erp/StatusBadge.jsx';
import { cn } from '../lib/utils.js';
import { typography } from '../styles/typography.js';

/**
 * 菜单壳占位页。
 *
 * 菜单结构以《系统与模块地图》附录为基线，还没实现的菜单先统一挂这个占位页，
 * 避免每个菜单各写一份空页面；字段清单和 PRD 完成后再逐个换成真实页面。
 */
export function createPlaceholderPage({ title, tag, note }) {
  function PlaceholderPage() {
    return (
      <main className="flex min-h-0 flex-1 flex-col bg-erp-surface">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-erp-border-header bg-erp-surface-panel px-4">
          <h1 className={cn(typography.pageTitle)}>{title}</h1>
          <StatusBadge tone={tag ? 'warning' : 'info'}>{tag ?? '一期'}</StatusBadge>
        </header>
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-[13px] text-erp-text-muted">页面规划中</p>
          <p className="text-[12px] text-erp-text-muted">{note ?? '菜单结构已经确定，字段清单和 PRD 完成后再接入页面。'}</p>
        </div>
      </main>
    );
  }

  return PlaceholderPage;
}
