const purchaseGroups = [
  {
    title: '采购单据',
    items: [
      { label: '采购订单', pageId: 'purchase-order' },
      { label: '采购入库', pageId: 'purchase-inbound' },
    ],
  },
];

export function PurchaseFlyout({ left = 141, top, maxHeight, onSelect }) {
  return (
    <div
      className="absolute z-50 w-fit min-w-[120px] overflow-y-auto rounded-erp-overlay border border-erp-sidebar-flyout-border bg-erp-sidebar-surface px-3 py-3.5 text-erp-sidebar-flyout-muted shadow-erp-flyout"
      style={{ left, top, maxHeight }}
      onMouseEnter={(event) => event.stopPropagation()}
    >
      {purchaseGroups.map((group) => (
        <section key={group.title}>
          <h2 className="border-b border-erp-sidebar-border pb-2.5 text-[13px] font-semibold text-erp-sidebar-flyout-muted">{group.title}</h2>
          <div className="mt-2 space-y-0.5">
            {group.items.map((item) => (
              <button
                key={item.pageId}
                type="button"
                className="block w-full rounded-erp-control px-1.5 text-left text-[13px] leading-8 text-erp-sidebar-flyout-text transition-colors hover:bg-erp-sidebar-flyout-hover hover:text-erp-primary-soft"
                onClick={() => onSelect(item.pageId)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function getPurchaseFlyoutLayout(triggerRect) {
  const viewportPadding = 12;
  const maxHeight = Math.max(160, window.innerHeight - viewportPadding * 2);
  const estimatedHeight = 118;
  const top = Math.min(
    Math.max(triggerRect.top - 8, viewportPadding),
    window.innerHeight - Math.min(estimatedHeight, maxHeight) - viewportPadding,
  );

  return { top, maxHeight };
}
