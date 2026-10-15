import { useDocumentRow } from '../hooks/useDocumentRow.js';
import { CROSSBORDER_ORDER_STORAGE_KEY, loadCrossBorderOrderById } from '../data/crossBorderOrderData.js';
import { EcommerceOrderDetailView, EcommerceOrderNotFoundView } from './ecommerceOrderShared.jsx';

/**
 * 跨境电商订单详情（F02～F04，二版 B3）：订单基础信息、订单行快照、关联结果单（可跳转）、
 * 异常回传记录与操作信息；整单只读，不出现FBA入口（主PRD §6.4、§7.6）。
 */
export function SalesCrossBorderOrderDetailPage({ context, onOpenPage }) {
  const row = useDocumentRow(context, { storageKey: CROSSBORDER_ORDER_STORAGE_KEY, loadById: loadCrossBorderOrderById });
  if (!row) return <EcommerceOrderNotFoundView kind="crossborder" onOpenPage={onOpenPage} />;
  return <EcommerceOrderDetailView row={row} kind="crossborder" onOpenPage={onOpenPage} />;
}
