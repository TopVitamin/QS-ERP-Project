import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { DOMESTIC_ORDER_STORAGE_KEY, loadDomesticOrderById } from '../data/domesticOrderData.js';
import { EcommerceOrderDetailView, EcommerceOrderNotFoundView } from './ecommerceOrderShared.jsx';

/**
 * 国内电商订单详情（F02～F04，二版 B3）：订单基础信息、订单行快照、关联结果单（可跳转）、
 * 异常回传记录与操作信息；整单只读，页头仅有履约状态标签与`返回列表`（主PRD §6.4）。
 */
export function SalesDomesticOrderDetailPage({ context, onOpenPage }) {
  const row = useDocumentRow(context, { storageKey: DOMESTIC_ORDER_STORAGE_KEY, loadById: loadDomesticOrderById });
  if (!row) return <EcommerceOrderNotFoundView kind="domestic" onOpenPage={onOpenPage} />;
  return <EcommerceOrderDetailView row={row} kind="domestic" onOpenPage={onOpenPage} />;
}
