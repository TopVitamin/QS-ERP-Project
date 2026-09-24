import { PriceAdjustFormPage } from './priceAdjustShared.jsx';

/** 采购价格调整单新增/编辑（主PRD F02）：单据信息 + 商品明细，保存草稿与提交。 */
export function PurchasePriceAdjustCreatePage(props) {
  return <PriceAdjustFormPage {...props} side="purchase" mode="create" />;
}

export function PurchasePriceAdjustEditPage(props) {
  return <PriceAdjustFormPage {...props} side="purchase" mode="edit" />;
}
