import { PriceListPage } from './priceListShared.jsx';

/** 销售价目表列表（价格管理-销售价目表）：只查看和查询，不提供新增、编辑、删除、禁用和导入（主PRD F01）。 */
export function SalesPriceListPage(props) {
  return <PriceListPage {...props} side="sales" />;
}
