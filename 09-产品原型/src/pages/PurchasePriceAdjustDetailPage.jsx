import { PriceAdjustDetailPage } from './priceAdjustShared.jsx';

/** 采购价格调整单详情（主PRD F05）：查看全貌、按状态办理审核驳回、追溯生效结果。 */
export function PurchasePriceAdjustDetailPage(props) {
  return <PriceAdjustDetailPage {...props} side="purchase" />;
}
