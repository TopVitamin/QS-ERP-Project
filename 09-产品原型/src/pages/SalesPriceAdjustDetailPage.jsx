import { PriceAdjustDetailPage } from './priceAdjustShared.jsx';

/** 销售价格调整单详情（主PRD F05）：查看全貌、按状态办理审核驳回、追溯生效结果。 */
export function SalesPriceAdjustDetailPage(props) {
  return <PriceAdjustDetailPage {...props} side="sales" />;
}
