import { PriceAdjustListPage } from './priceAdjustShared.jsx';

/** 销售价格调整单列表（价格管理-销售价格调整单）：查询、行内办理与导出（主PRD F01）。 */
export function SalesPriceAdjustListPage(props) {
  return <PriceAdjustListPage {...props} side="sales" />;
}
