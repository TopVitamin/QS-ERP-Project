import { NavigationFlyout, getNavigationFlyoutLayout } from './NavigationFlyout.jsx';

export const purchaseGroups = [
  {
    title: '采购单据',
    items: [
      { label: '采购订单', pageId: 'purchase-order' },
      { label: '采购入库', pageId: 'purchase-inbound' },
    ],
  },
];

export function PurchaseFlyout(props) {
  return <NavigationFlyout groups={purchaseGroups} {...props} />;
}

export function getPurchaseFlyoutLayout(triggerRect) {
  return getNavigationFlyoutLayout(triggerRect);
}

export { NavigationFlyout, getNavigationFlyoutLayout };
