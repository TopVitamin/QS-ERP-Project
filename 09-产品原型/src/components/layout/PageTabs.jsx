import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, MoreHorizontal, X } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu.jsx';
import { cn } from '../../lib/utils.js';

export function PageTabs({ tabs = [], activeView, onTabSelect, onTabClose, onTabAction }) {
  const viewportRef = useRef(null);
  const tabRefs = useRef(new Map());
  const [scrollState, setScrollState] = useState({ hasOverflow: false, canScrollLeft: false, canScrollRight: false });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return undefined;

    function syncScrollState() {
      const maxScrollLeft = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
      setScrollState({
        hasOverflow: maxScrollLeft > 1,
        canScrollLeft: viewport.scrollLeft > 1,
        canScrollRight: maxScrollLeft - viewport.scrollLeft > 1,
      });
    }

    syncScrollState();
    viewport.addEventListener('scroll', syncScrollState, { passive: true });
    window.addEventListener('resize', syncScrollState);
    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(syncScrollState);
    resizeObserver?.observe(viewport);

    return () => {
      viewport.removeEventListener('scroll', syncScrollState);
      window.removeEventListener('resize', syncScrollState);
      resizeObserver?.disconnect();
    };
  }, [tabs.length]);

  useEffect(() => {
    tabRefs.current.get(activeView)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeView, tabs.length]);

  function scrollTabs(direction) {
    viewportRef.current?.scrollBy({ left: direction * 180, behavior: 'smooth' });
  }

  const showOverflowTools = scrollState.hasOverflow || tabs.length > 3;

  return (
    <div className="flex min-w-0 flex-1 items-stretch" aria-label="页面标签页">
      {scrollState.canScrollLeft && (
        <button
          type="button"
          aria-label="向左滚动标签页"
          className="flex w-7 shrink-0 items-center justify-center border-r border-erp-border-light text-erp-text-subtle hover:bg-erp-surface-panel hover:text-erp-primary"
          onClick={() => scrollTabs(-1)}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
        </button>
      )}

      <div ref={viewportRef} role="tablist" aria-label="已打开页面" className="no-scrollbar flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = activeView === tab.id;
          return (
            <div
              key={tab.id}
              ref={(node) => {
                if (node) tabRefs.current.set(tab.id, node);
                else tabRefs.current.delete(tab.id);
              }}
              className={cn(
                'group flex h-12 max-w-[188px] min-w-0 shrink-0 items-stretch border-r border-erp-border-light',
                isActive ? 'rounded-t-erp-section bg-erp-surface-panel' : 'bg-transparent hover:bg-erp-surface-panel/60',
              )}
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                title={tab.title}
                className={cn(
                  'min-w-0 flex-1 truncate px-2.5 text-left text-[13px] transition-colors',
                  isActive ? 'text-erp-primary' : 'text-erp-text-muted group-hover:text-erp-text',
                )}
                onClick={() => onTabSelect?.(tab.id)}
              >
                <span className="block truncate">{tab.title}</span>
              </button>
              {tabs.length > 1 && (
                <button
                  type="button"
                  aria-label={`关闭 ${tab.title}`}
                  className={cn(
                    'mr-1 self-center rounded-erp-control p-0.5 opacity-0 transition-all duration-150 group-hover:opacity-100 focus-visible:opacity-100',
                    isActive ? 'text-erp-text-subtle hover:bg-erp-primary-soft hover:text-erp-primary' : 'text-erp-text-placeholder hover:bg-erp-surface-panel/70 hover:text-erp-text-muted',
                  )}
                  onClick={() => onTabClose?.(tab.id)}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {scrollState.canScrollRight && (
        <button
          type="button"
          aria-label="向右滚动标签页"
          className="flex w-7 shrink-0 items-center justify-center border-l border-erp-border-light text-erp-text-subtle hover:bg-erp-surface-panel hover:text-erp-primary"
          onClick={() => scrollTabs(1)}
        >
          <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
        </button>
      )}

      {showOverflowTools && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="查看全部标签页"
              title="查看全部标签页"
              className="flex w-8 shrink-0 items-center justify-center border-l border-erp-border-light text-erp-text-subtle hover:bg-erp-surface-panel hover:text-erp-primary"
            >
              <MoreHorizontal className="h-4 w-4" strokeWidth={1.8} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[min(70vh,360px)] w-56 overflow-y-auto">
            <DropdownMenuLabel>已打开的页面（{tabs.length}）</DropdownMenuLabel>
            {tabs.map((tab) => (
              <DropdownMenuItem key={tab.id} onSelect={() => onTabSelect?.(tab.id)}>
                <Check className={cn('h-3.5 w-3.5 shrink-0 text-erp-primary', activeView === tab.id ? 'opacity-100' : 'opacity-0')} strokeWidth={2} />
                <span className="min-w-0 truncate" title={tab.title}>{tab.title}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={tabs.length <= 1} onSelect={() => onTabAction?.('closeOthers', activeView)}>
              关闭其他标签页
            </DropdownMenuItem>
            <DropdownMenuItem disabled={tabs.length <= 1} onSelect={() => onTabAction?.('closeAll', activeView)}>
              关闭全部标签页（保留当前）
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
