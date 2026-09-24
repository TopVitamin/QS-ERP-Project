import { PriceAdjustFormPage } from './priceAdjustShared.jsx';

/** 销售价格调整单新增/编辑（主PRD F02）：面向范围与范围值、币别、备注与商品明细。 */
export function SalesPriceAdjustCreatePage(props) {
  return <PriceAdjustFormPage {...props} side="sales" mode="create" />;
}

export function SalesPriceAdjustEditPage(props) {
  return <PriceAdjustFormPage {...props} side="sales" mode="edit" />;
}
