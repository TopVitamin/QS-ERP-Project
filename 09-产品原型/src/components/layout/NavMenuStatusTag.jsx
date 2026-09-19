import { INCOMPLETE_MENU_TAG } from '../../config/implementedPages.js';
import { cn } from '../../lib/utils.js';

export function NavMenuStatusTag({ className }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-[3px] border border-erp-sidebar-flyout-border/70 px-1 text-[10px] leading-4 text-erp-sidebar-flyout-muted',
        className,
      )}
    >
      {INCOMPLETE_MENU_TAG}
    </span>
  );
}
