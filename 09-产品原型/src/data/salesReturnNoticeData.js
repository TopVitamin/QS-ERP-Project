import { resolveOptionLabel } from '../lib/codeName.js';
import { readMockRows, writeMockRows } from '../lib/mockStorage.js';
import {
  formatReturnReceiveMode,
  normalizeSalesReturnNoticeRow,
  RETURN_NOTICE_STORAGE_KEY,
  returnNoticeStatusLabels,
} from '../lib/salesReturnNoticeLogic.js';
import { customerOptions, logicalWarehouseOptions } from './masterData.js';
import { salesReturns } from './salesReturnData.js';

function findReturn(returnNo) {
  return salesReturns.find((row) => row.returnNo === returnNo) || null;
}

/** 通知明细行沿用来源退货单行（商品、条码、名称、单位随来源行带出） */
function noticeLine({ id, returnRow, lineIndex = 0, notifyQty, receivedQty = 0 }) {
  const sourceLine = returnRow?.lines?.[lineIndex] || {};
  return {
    id,
    sourceReturnLineId: sourceLine.id || '',
    product: sourceLine.product || '',
    productCode: sourceLine.productCode || '',
    barcode: sourceLine.barcode || '',
    productName: sourceLine.productName || '',
    unit: sourceLine.unit || '个',
    pushableQty: sourceLine.pushableQty ?? 0,
    notifyQty,
    receivedQty,
    shortQty: Math.max(0, notifyQty - receivedQty),
  };
}

function buildNotice({
  id,
  noticeNo,
  sourceReturnNo,
  status,
  receiveMode = 'warehouse',
  notifyQty,
  receivedQty = 0,
  lineIndex = 0,
  inboundId = '',
  inboundNo = '',
  ...rest
}) {
  const returnRow = findReturn(sourceReturnNo);
  return normalizeSalesReturnNoticeRow({
    id,
    noticeNo,
    sourceReturnId: returnRow?.id || '',
    sourceReturnNo,
    customer: returnRow?.customer || '',
    warehouse: returnRow?.warehouse || '',
    receiveMode,
    status,
    inboundId,
    inboundNo,
    lines: [noticeLine({ id: `${id}-line-1`, returnRow, lineIndex, notifyQty, receivedQty })],
    ...rest,
  });
}

const seedNotices = [
  buildNotice({
    id: 'sales-return-notice-1',
    noticeNo: 'XTSHTZ-20260919-0001',
    sourceReturnNo: 'XSTH-20260918-0005',
    status: 'pending_receive',
    notifyQty: 2,
    remark: '第二批复退收货',
    pushTime: '2026-09-19 16:05:00',
    lastHandledTime: '2026-09-19 16:05:00',
    creator: '张三',
    createdAt: '2026-09-19 16:00:00',
    updater: '张三',
    updatedAt: '2026-09-19 16:05:00',
  }),
  buildNotice({
    id: 'sales-return-notice-2',
    noticeNo: 'XTSHTZ-20260918-0002',
    sourceReturnNo: 'XSTH-20260918-0005',
    status: 'received',
    notifyQty: 3,
    receivedQty: 3,
    inboundId: 'sales-return-inbound-2',
    inboundNo: 'XTRK-20260917-0001',
    remark: '第一批退货收货',
    pushTime: '2026-09-17 11:00:00',
    finalReceiveTime: '2026-09-17 15:30:00',
    lastHandledTime: '2026-09-17 15:30:00',
    creator: '张三',
    createdAt: '2026-09-17 10:50:00',
    updater: '张三',
    updatedAt: '2026-09-17 15:30:00',
  }),
  buildNotice({
    id: 'sales-return-notice-3',
    noticeNo: 'XTSHTZ-20260918-0003',
    sourceReturnNo: 'XSTH-20260917-0006',
    status: 'received',
    receiveMode: 'virtual',
    notifyQty: 5,
    receivedQty: 5,
    inboundId: 'sales-return-inbound-3',
    inboundNo: 'XTRK-20260918-0001',
    remark: '虚拟入库，不推仓库',
    finalReceiveTime: '2026-09-18 10:30:00',
    lastHandledTime: '2026-09-18 10:30:00',
    creator: '李四',
    createdAt: '2026-09-18 10:30:00',
    updater: '李四',
    updatedAt: '2026-09-18 10:30:00',
  }),
  buildNotice({
    id: 'sales-return-notice-4',
    noticeNo: 'XTSHTZ-20260913-0004',
    sourceReturnNo: 'XSTH-20260913-0014',
    status: 'cancelled',
    notifyQty: 12,
    cancelReason: '仓库零收，通知按零收取消',
    cancelTime: '2026-09-13 17:00:00',
    cancelOperator: '李四',
    lastHandledTime: '2026-09-13 17:00:00',
    creator: '李四',
    createdAt: '2026-09-13 16:20:00',
    updater: '李四',
    updatedAt: '2026-09-13 17:00:00',
  }),
  buildNotice({
    id: 'sales-return-notice-5',
    noticeNo: 'XTSHTZ-20260920-0005',
    sourceReturnNo: 'XSTH-20260917-0007',
    status: 'pending_push',
    notifyQty: 3,
    remark: '待推送演示',
    lastHandledTime: '2026-09-20 09:00:00',
    creator: '王芳',
    createdAt: '2026-09-20 08:55:00',
    updater: '王芳',
    updatedAt: '2026-09-20 09:00:00',
  }),
  buildNotice({
    id: 'sales-return-notice-6',
    noticeNo: 'XTSHTZ-20260920-0006',
    sourceReturnNo: 'XSTH-20260917-0007',
    status: 'push_failed',
    notifyQty: 3,
    remark: '推送失败演示',
    pushFailReason: '仓库接口超时，未确认接收',
    lastHandledTime: '2026-09-20 09:10:00',
    creator: '王芳',
    createdAt: '2026-09-20 08:58:00',
    updater: '王芳',
    updatedAt: '2026-09-20 09:10:00',
  }),
  buildNotice({
    id: 'sales-return-notice-7',
    noticeNo: 'XTSHTZ-20260919-0007',
    sourceReturnNo: 'XSTH-20260916-0008',
    status: 'cancelling',
    notifyQty: 8,
    remark: '已发起取消，等待仓库回执',
    pushTime: '2026-09-19 09:00:00',
    cancelReason: '客户取消本次收货',
    lastHandledTime: '2026-09-20 10:30:00',
    creator: '张三',
    createdAt: '2026-09-19 08:50:00',
    updater: '张三',
    updatedAt: '2026-09-20 10:30:00',
  }),
  buildNotice({
    id: 'sales-return-notice-8',
    noticeNo: 'XTSHTZ-20260921-0008',
    sourceReturnNo: 'XSTH-20260914-0013',
    status: 'pushing',
    notifyQty: 2,
    remark: '正在推送仓库',
    lastHandledTime: '2026-09-21 10:05:00',
    creator: '张三',
    createdAt: '2026-09-21 10:00:00',
    updater: '张三',
    updatedAt: '2026-09-21 10:05:00',
  }),
  buildNotice({
    id: 'sales-return-notice-9',
    noticeNo: 'XTSHTZ-20260919-0009',
    sourceReturnNo: 'XSTH-20260916-0008',
    status: 'received',
    notifyQty: 5,
    receivedQty: 4,
    inboundId: 'sales-return-inbound-9',
    inboundNo: 'XTRK-20260919-0001',
    remark: '少收 1 件，缺量回补可下推量',
    pushTime: '2026-09-19 09:00:00',
    finalReceiveTime: '2026-09-19 15:20:00',
    lastHandledTime: '2026-09-19 15:20:00',
    creator: '张三',
    createdAt: '2026-09-18 17:30:00',
    updater: '张三',
    updatedAt: '2026-09-19 15:20:00',
  }),
  buildNotice({
    id: 'sales-return-notice-10',
    noticeNo: 'XTSHTZ-20260915-0010',
    sourceReturnNo: 'XSTH-20260914-0012',
    status: 'cancelled',
    notifyQty: 8,
    cancelReason: '随销售退货单取消',
    cancelTime: '2026-09-15 11:00:00',
    cancelOperator: '张三',
    lastHandledTime: '2026-09-15 11:00:00',
    creator: '李四',
    createdAt: '2026-09-14 11:30:00',
    updater: '张三',
    updatedAt: '2026-09-15 11:00:00',
  }),
];

export const salesReturnNotices = seedNotices;

// Mock 种子首次加载时写入本地存储：退货单删除阻断、关联单据在未打开通知列表前也能读到数据。
if (readMockRows(RETURN_NOTICE_STORAGE_KEY, null) == null) {
  writeMockRows(RETURN_NOTICE_STORAGE_KEY, salesReturnNotices);
}

export function getSalesReturnNoticeStatusBadges(row) {
  const toneMap = {
    pending_push: 'warning',
    pushing: 'info',
    push_failed: 'danger',
    pending_receive: 'info',
    cancelling: 'warning',
    received: 'success',
    cancelled: 'danger',
  };
  return [{ label: returnNoticeStatusLabels[row?.status] || row?.status, tone: toneMap[row?.status] || 'default' }];
}

const qtyCell = (value) => value ?? 0;

export const salesReturnNoticeColumns = [
  { key: 'noticeNo', label: '单号', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'sourceReturnNo', label: '来源销售退货单', defaultWidth: 190, minWidth: 170, maxWidth: 240, ellipsis: true, link: true },
  { key: 'customer', label: '客户', defaultWidth: 200, minWidth: 140, maxWidth: 280, ellipsis: true, render: (value) => resolveOptionLabel(value, customerOptions) },
  { key: 'warehouse', label: '收货仓库', defaultWidth: 170, minWidth: 130, maxWidth: 230, ellipsis: true, render: (value) => resolveOptionLabel(value, logicalWarehouseOptions) },
  { key: 'receiveMode', label: '收货处理方式', defaultWidth: 120, minWidth: 110, maxWidth: 160, ellipsis: true, render: (value) => formatReturnReceiveMode(value) },
  { key: 'status', label: '单据状态', defaultWidth: 96, minWidth: 88, maxWidth: 140, ellipsis: true, render: (value) => returnNoticeStatusLabels[value] || value, tone: (value) => (value === 'received' ? 'text-erp-success' : value === 'pending_receive' || value === 'pushing' ? 'text-erp-info' : value === 'push_failed' || value === 'cancelled' ? 'text-erp-danger' : 'text-erp-warning') },
  { key: 'totalNotifyQty', label: '通知数量', defaultWidth: 96, minWidth: 80, maxWidth: 120, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalReceivedQty', label: '实收数量', defaultWidth: 96, minWidth: 80, maxWidth: 120, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'totalShortQty', label: '缺收数量', defaultWidth: 96, minWidth: 80, maxWidth: 120, ellipsis: true, align: 'right', sortable: true, render: qtyCell },
  { key: 'createdAt', label: '创建时间', defaultWidth: 160, minWidth: 140, maxWidth: 200, ellipsis: true, sortable: true },
];

export function buildSourceReturnFilterOptions(rows = []) {
  const map = new Map();
  rows.forEach((row) => {
    if (!row.sourceReturnNo) return;
    map.set(row.sourceReturnNo, { value: row.sourceReturnNo, label: row.sourceReturnNo });
  });
  return [{ value: '', label: '全部来源销售退货单' }, ...map.values()];
}
