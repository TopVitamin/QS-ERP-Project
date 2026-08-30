export function NavigationFlyout({ groups = [], left = 141, top, maxHeight, activePageId, onSelect }) {
  return (
    <div
      className={`absolute z-50 overflow-hidden rounded-erp-overlay border border-erp-sidebar-flyout-border bg-erp-sidebar-surface px-3 py-3.5 text-erp-sidebar-flyout-muted shadow-erp-flyout ${groups.length > 1 ? 'w-[360px] max-w-[calc(100vw-180px)]' : 'w-fit min-w-[160px]'}`}
      style={{ left, top, maxHeight }}
      onMouseEnter={(event) => event.stopPropagation()}
    >
      <div className={`no-scrollbar max-h-full overflow-y-auto overscroll-contain ${groups.length > 1 ? 'grid grid-cols-2 gap-x-5' : ''}`}>
        {groups.map((group) => (
          <section key={group.title} className="min-w-0">
            <h2 className="border-b border-erp-sidebar-border pb-2.5 text-[13px] font-semibold text-erp-sidebar-flyout-muted">{group.title}</h2>
            <div className="mt-2 space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.pageId}
                  type="button"
                  className={`block w-full truncate rounded-erp-control px-1.5 text-left text-[13px] leading-8 transition-colors hover:bg-erp-sidebar-flyout-hover hover:text-erp-primary-soft ${activePageId === item.pageId ? 'bg-erp-sidebar-flyout-hover text-erp-primary-soft' : 'text-erp-sidebar-flyout-text'}`}
                  onClick={() => onSelect?.(item.pageId)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function getNavigationFlyoutLayout(triggerRect, estimatedHeight = 420) {
  const viewportPadding = 12;
  const maxHeight = Math.max(160, window.innerHeight - viewportPadding * 2);
  const top = Math.min(
    Math.max(triggerRect.top - 8, viewportPadding),
    window.innerHeight - Math.min(estimatedHeight, maxHeight) - viewportPadding,
  );

  return { top, maxHeight };
}
