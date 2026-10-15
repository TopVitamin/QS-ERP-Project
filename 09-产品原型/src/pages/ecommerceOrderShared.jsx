/**
 * 国内电商订单 / 跨境电商订单详情共用视图（并列对象，结构一致；二版 B3）。
 *
 * 分区顺序按《页面骨架》：页头（标题＋回传状态标签＋返回列表）→ 订单基础信息 → 订单行快照 →
 * 关联结果单（胶囊Tab，始终展示）→ 异常回传记录（有记录时展示）→ 操作信息。
 * 本对象只读：页头无业务按钮，不提供重试、修复、改单入口（主PRD R02、§6.4）。
 */
import { useEffect, useMemo, useState } from 'react';
import { DetailField, DocumentDetailFrame, EditorCard } from '../components/erp/DocumentDetailFrame.jsx';
import { DocumentMetaTabsCard, buildOperationInfoTabs } from '../components/erp/DocumentMetaTabsCard.jsx';
import { RelatedDocumentsCard } from '../components/erp/RelatedDocumentsCard.jsx';
import { DocumentSummaryBar } from '../components/erp/DocumentSummaryBar.jsx';
import { erpFieldGridClassName } from '../styles/typography.js';
import { EMPTY_PLACEHOLDER, formatAmount } from '../lib/format.js';
import { resolveOptionLabel } from '../lib/codeName.js';
import { subscribeMockRows } from '../lib/mockStorage.js';
import { customerOptions, currencyOptions } from '../data/masterData.js';
import { PUSH_EXCEPTION_STORAGE_KEY } from '../data/pushExceptionData.js';
import { SALES_OUTBOUND_STORAGE_KEY } from '../lib/salesOutboundLogic.js';
import { RETURN_INBOUND_STORAGE_KEY } from '../lib/salesReturnInboundLogic.js';
import {
  buildOrderResultSections,
  ecommerceOrderKindConfig,
  loadOrderExceptionRecords,
  loadResultDocRow,
  orderFulfillmentStatusLabels,
  orderFulfillmentStatusTones,
  orderResultDocLabels,
  refreshEcommerceOrderRow,
  renderExceptionStage,
  renderExceptionStatus,
} from '../lib/ecommerceOrderLogic.js';
import { cn } from '../lib/utils.js';

const tableClassName = 'w-full table-fixed border-collapse text-left text-[12px]';
const theadClassName = 'h-7 border-b border-erp-border-table-header bg-erp-surface-table-head text-erp-text-section';
const thClassName = 'border-r border-erp-border-table-column px-2 font-normal last:border-r-0';
const rowClassName = 'h-8 border-b border-erp-border-table-row last:border-b-0';
const tdClassName = 'border-r border-erp-border-table-column px-2 align-middle last:border-r-0';
const tableShellClassName = 'overflow-hidden rounded border border-erp-border-table-row';

function formatChannelAmount(value) {
  return value === '' || value == null ? EMPTY_PLACEHOLDER : formatAmount(value);
}

function sumLineAmounts(lines, key) {
  const values = (lines || []).map((line) => line[key]).filter((value) => value !== '' && value != null);
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + Number(value || 0), 0);
}

/** 订单行快照列（顺序按详细稿「订单行快照」分组；不含价税拆分列）。 */
const orderLineColumns = [
  { key: 'lineNo', label: '行号', align: 'center' },
  { key: 'platformSku', label: '平台商品编码' },
  { key: 'productCode', label: '商品编码' },
  { key: 'productName', label: '商品名称' },
  { key: 'unit', label: '基本单位' },
  { key: 'quantity', label: '订购数量', align: 'right' },
  { key: 'shippedQty', label: '累计实际出库数量', align: 'right' },
  { key: 'returnedQty', label: '累计实际退回数量', align: 'right' },
  { key: 'amount', label: '成交优惠后金额', align: 'right' },
  { key: 'returnAmount', label: '退货金额', align: 'right' },
];

function renderOrderLineCell(line, column) {
  if (column.key === 'quantity' || column.key === 'shippedQty' || column.key === 'returnedQty') {
    return line[column.key] ?? 0;
  }
  if (column.key === 'amount' || column.key === 'returnAmount') {
    return formatChannelAmount(line[column.key]);
  }
  return line[column.key] || EMPTY_PLACEHOLDER;
}

/**
 * 订单相关数据订阅：结果单与异常记录变化（如结果处理 Mock 处理原记录）后即时刷新
 * 累计数量、回传状态与异常回传记录。
 */
export function useOrderRelatedData(row, kind) {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const bump = () => setRevision((value) => value + 1);
    const unsubscribes = [
      subscribeMockRows(SALES_OUTBOUND_STORAGE_KEY, bump),
      subscribeMockRows(RETURN_INBOUND_STORAGE_KEY, bump),
      subscribeMockRows(PUSH_EXCEPTION_STORAGE_KEY, bump),
    ];
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, []);

  return useMemo(() => {
    if (!row) return { order: null, exceptions: [] };
    return {
      order: refreshEcommerceOrderRow(row, kind),
      exceptions: loadOrderExceptionRecords(row, kind),
    };
    // revision 用于在结果单／异常记录存储变化后强制重新派生
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row, kind, revision]);
}

function buildBaseInfoFields(order) {
  return [
    { key: 'orderNo', label: '订单编号', value: order.orderNo },
    { key: 'sourceSystem', label: '来源系统', value: order.sourceSystemLabel },
    { key: 'channelOrderNo', label: '渠道单号', value: order.channelOrderNo },
    { key: 'platformOrderNo', label: '平台单号', value: order.platformOrderNo },
    { key: 'platform', label: '平台', value: order.platform || EMPTY_PLACEHOLDER },
    { key: 'shop', label: '店铺', value: order.shop },
    { key: 'orderedAt', label: '下单时间', value: order.orderedAt },
    { key: 'customer', label: '客户', value: resolveOptionLabel(order.customer, customerOptions) },
    { key: 'currency', label: '币别', value: resolveOptionLabel(order.currency, currencyOptions) },
    { key: 'amount', label: '成交优惠后金额合计', value: formatChannelAmount(order.amount) },
    { key: 'returnAmount', label: '退货金额合计', value: formatChannelAmount(order.returnAmount) },
    { key: 'fulfillmentStatus', label: '回传状态', value: orderFulfillmentStatusLabels[order.fulfillmentStatus] || order.fulfillmentStatus },
  ];
}

/** 订单行快照：只读明细表 + 合计行（一期不分页，窄视口横向滚动）。 */
function OrderLineSnapshotCard({ order }) {
  return (
    <EditorCard title="订单行快照">
      <div className="p-4">
        <div className={tableShellClassName}>
          <div className="table-scroll overflow-x-auto">
            <table className={tableClassName} style={{ minWidth: '1220px' }}>
              <thead className={theadClassName}>
                <tr>
                  {orderLineColumns.map((column) => (
                    <th key={column.key} className={cn(thClassName, column.align === 'right' && 'text-right')}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-erp-surface-panel text-erp-text">
                {order.lines.map((line) => (
                  <tr key={line.id || line.lineNo} className={rowClassName}>
                    {orderLineColumns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(tdClassName, column.align === 'right' && 'text-right', column.muted && 'text-erp-text-muted')}
                      >
                        <div className="truncate">{renderOrderLineCell(line, column)}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <DocumentSummaryBar
                columns={orderLineColumns}
                summary={{
                  quantity: order.totalOrderedQty,
                  shippedQty: order.totalShippedQty,
                  returnedQty: order.totalReturnedQty,
                  amount: formatChannelAmount(sumLineAmounts(order.lines, 'amount')),
                  returnAmount: formatChannelAmount(sumLineAmounts(order.lines, 'returnAmount')),
                }}
              />
            </table>
          </div>
        </div>
      </div>
    </EditorCard>
  );
}

/** 异常回传记录：仅当订单存在记录时展示；只读，处理入口在系统集成中心（主PRD R10）。 */
function OrderExceptionRecordsCard({ exceptions, onOpenPage }) {
  if (!exceptions.length) return null;

  return (
    <EditorCard title="异常回传记录">
      <div className="px-4 pt-3 pb-3">
        <div className={tableShellClassName}>
          <div className="table-scroll overflow-x-auto">
            <table className={tableClassName} style={{ minWidth: '980px' }}>
              <thead className={theadClassName}>
                <tr>
                  <th className={thClassName}>执行标识</th>
                  <th className={thClassName}>异常环节</th>
                  <th className={thClassName}>失败时间</th>
                  <th className={thClassName}>失败原因</th>
                  <th className={thClassName}>处理状态</th>
                  <th className={thClassName}>关联结果单</th>
                </tr>
              </thead>
              <tbody className="bg-erp-surface-panel text-erp-text">
                {exceptions.map((exception) => {
                  const target = loadResultDocRow(exception);
                  return (
                    <tr key={exception.id} className={rowClassName}>
                      <td className={tdClassName}>{exception.executionId || EMPTY_PLACEHOLDER}</td>
                      <td className={tdClassName}>{renderExceptionStage(exception.stage)}</td>
                      <td className={tdClassName}>{exception.failTime || EMPTY_PLACEHOLDER}</td>
                      <td className={tdClassName}><div className="truncate" title={exception.failReason || ''}>{exception.failReason || EMPTY_PLACEHOLDER}</div></td>
                      <td className={cn(tdClassName, exception.status === 'pending' ? 'text-erp-warning' : 'text-erp-success')}>
                        {renderExceptionStatus(exception.status)}
                      </td>
                      <td className={tdClassName}>
                        {target ? (
                          <button
                            type="button"
                            className="truncate text-erp-primary hover:underline"
                            onClick={() => onOpenPage?.(target.pageId, { row: target.row })}
                          >
                            {exception.resultDocNo}
                          </button>
                        ) : EMPTY_PLACEHOLDER}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <p className="mt-2 text-[12px] text-erp-text-muted">
          处理入口在系统集成中心-推送异常-结果处理页签，本页不提供重试与修复按钮；修复后由系统按接口机制自动重试处理原记录。
        </p>
      </div>
    </EditorCard>
  );
}

/** 操作日志：接收订单、关联结果单、累计数量刷新、异常记录与恢复（详情 Demo PRD §3.5）。 */
function buildOrderOperationLogs(order, sections, exceptions) {
  const entries = [];

  if (order.createdAt) {
    entries.push({
      id: `receive-${order.createdAt}`,
      time: order.createdAt,
      operator: '系统',
      action: '接收订单',
      remark: `接收${order.sourceSystemLabel}回传订单，生成ERP单号`,
    });
  }

  sections[0]?.rows?.forEach((outbound) => {
    entries.push({
      id: `link-out-${outbound.outboundNo}`,
      time: outbound.actualOutboundTime || outbound.businessDate,
      operator: '系统',
      action: '关联结果单',
      remark: `关联销售出库单 ${outbound.outboundNo}，累计实际出库数量刷新`,
    });
  });
  sections[1]?.rows?.forEach((inbound) => {
    entries.push({
      id: `link-in-${inbound.inboundNo}`,
      time: inbound.actualReceiveTime || inbound.businessDate,
      operator: '系统',
      action: '关联结果单',
      remark: `关联销退入库单 ${inbound.inboundNo}，累计实际退回数量刷新`,
    });
  });

  exceptions.forEach((exception) => {
    entries.push({
      id: `exception-${exception.id}`,
      time: exception.failTime,
      operator: '系统',
      action: '异常记录',
      remark: `${renderExceptionStage(exception.stage)}：${exception.failReason || ''}`,
    });
    if (exception.status === 'handled') {
      const handledTime = exception.handledAt || (exception.records || [])[exception.records.length - 1]?.time || exception.failTime;
      entries.push({
        id: `recover-${exception.id}`,
        time: handledTime,
        operator: '系统',
        action: '异常恢复',
        remark: exception.resultDocNo
          ? `处理原记录成功，生成${orderResultDocLabels[exception.resultDocType] || '结果单'} ${exception.resultDocNo}`
          : '处理原记录成功，异常记录置为已处理',
      });
    }
  });

  return entries.sort((left, right) => String(right.time || '').localeCompare(String(left.time || '')));
}

/** 订单详情（两类订单共用；结构一致，差异仅有标题与来源系统）。 */
export function EcommerceOrderDetailView({ row, kind, onOpenPage }) {
  const config = ecommerceOrderKindConfig[kind];
  const listPageId = kind === 'crossborder' ? 'sales-crossborder-order' : 'sales-domestic-order';
  const { order, exceptions } = useOrderRelatedData(row, kind);
  if (!order) return null;

  const sections = buildOrderResultSections(order, kind);
  const logs = buildOrderOperationLogs(order, sections, exceptions);

  return (
    <DocumentDetailFrame
      title={`${config.label}详情 · ${order.orderNo}`}
      statuses={[{ label: orderFulfillmentStatusLabels[order.fulfillmentStatus] || order.fulfillmentStatus, tone: orderFulfillmentStatusTones[order.fulfillmentStatus] || 'neutral' }]}
      onBack={() => onOpenPage?.(listPageId)}
    >
      <EditorCard title="订单基础信息">
        <div className={erpFieldGridClassName}>
          {buildBaseInfoFields(order).map((field) => (
            <DetailField key={field.key} label={field.label} value={field.value} className={field.className} />
          ))}
        </div>
      </EditorCard>

      <OrderLineSnapshotCard order={order} />

      <RelatedDocumentsCard sections={sections} onOpenPage={onOpenPage} />

      <OrderExceptionRecordsCard exceptions={exceptions} onOpenPage={onOpenPage} />

      <DocumentMetaTabsCard
        title="操作信息"
        defaultTab="create"
        tabs={buildOperationInfoTabs({
          row: order,
          buildLogs: () => logs,
          toMetaRow: (metaRow) => ({ ...metaRow, creator: metaRow.creator || '系统', updater: metaRow.updater || '系统' }),
        })}
      />
    </DocumentDetailFrame>
  );
}

/** 订单不存在或不可访问：框架统一错误态（详情 Demo PRD §6.2）。 */
export function EcommerceOrderNotFoundView({ kind, onOpenPage }) {
  const listPageId = kind === 'crossborder' ? 'sales-crossborder-order' : 'sales-domestic-order';
  return (
    <DocumentDetailFrame title="订单不存在" onBack={() => onOpenPage?.(listPageId)}>
      <EditorCard title="提示">
        <p className="px-4 py-4 text-[12px] text-erp-text-muted">订单不存在或已不可查看，请返回列表查看。</p>
      </EditorCard>
    </DocumentDetailFrame>
  );
}
