import { EMPTY_PLACEHOLDER } from './format.js';
import { kingdeePushStatusLabels } from './inboundLogic.js';

function hasValue(value) {
  return value != null && value !== '' && value !== EMPTY_PLACEHOLDER;
}

function pushEntry(entries, { time, operator, action, remark }) {
  if (!hasValue(time) && !hasValue(operator) && !hasValue(action)) return;
  entries.push({
    id: `${action}-${time || entries.length}`,
    time: time || EMPTY_PLACEHOLDER,
    operator: operator || EMPTY_PLACEHOLDER,
    action,
    remark: remark || EMPTY_PLACEHOLDER,
  });
}

function sortLogEntries(entries) {
  return [...entries].sort((left, right) => String(right.time).localeCompare(String(left.time)));
}

function mergeLogs(...sources) {
  const map = new Map();
  sources.flat().forEach((entry) => {
    if (!entry) return;
    map.set(entry.id, entry);
  });
  return sortLogEntries([...map.values()]);
}

export function buildPurchaseOrderOperationLogs(row) {
  const entries = [];

  pushEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: '创建采购订单',
  });

  if (row.auditStatus === 'pending' || row.auditStatus === 'approved') {
    pushEntry(entries, {
      time: row.submittedAt || row.createdAt,
      operator: row.submitter || row.creator,
      action: '提交',
      remark: '提交审核',
    });
  }

  if (row.returnComment) {
    pushEntry(entries, {
      time: row.returnedAt || row.updatedAt,
      operator: row.returnOperator || row.updater,
      action: '撤回',
      remark: row.returnComment,
    });
  }

  if (row.auditStatus === 'approved' && row.auditTime) {
    pushEntry(entries, {
      time: row.auditTime,
      operator: row.auditor,
      action: '审核',
      remark: '审核通过',
    });
  }

  if (row.businessStatus === 'cancelled') {
    pushEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }

  if (row.businessStatus === 'closed') {
    pushEntry(entries, {
      time: row.closeTime,
      operator: row.closeOperator,
      action: '关闭',
      remark: row.closeReason || (row.closeType === 'auto' ? '到期自动关闭' : '手动关闭'),
    });
  }

  if (row.deliveryAdjustedAt) {
    pushEntry(entries, {
      time: row.deliveryAdjustedAt,
      operator: row.deliveryAdjustedBy || row.updater,
      action: '调整交期',
      remark: row.deliveryDate ? `承诺交期调整为 ${row.deliveryDate}` : '调整承诺交期',
    });
  }

  return mergeLogs(entries, row.operationLogs || []);
}

export function buildReceiptNoticeOperationLogs(row) {
  const entries = [];

  pushEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: row.receiptMode === 'virtual' ? '下推创建采购收货通知单（虚拟入库）' : '下推创建采购收货通知单',
  });

  if (row.pushTime) {
    pushEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送仓库',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送仓库成功',
    });
  }

  if (row.finalReceiveTime) {
    pushEntry(entries, {
      time: row.finalReceiveTime,
      operator: '系统',
      action: '收货完成',
      remark: row.receiptMode === 'virtual' ? '按通知数量确认收货' : '仓库回传收货结果',
    });
  }

  if (row.status === 'cancelled') {
    pushEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }

  return mergeLogs(entries, row.operationLogs || []);
}

export function buildInboundOperationLogs(row) {
  const entries = [];

  pushEntry(entries, {
    time: row.createdAt,
    operator: row.creator || '系统',
    action: '生成',
    remark: '根据收货通知回传生成入库单',
  });

  if (row.auditTime) {
    pushEntry(entries, {
      time: row.auditTime,
      operator: row.auditor || '系统',
      action: '审核',
      remark: '自动审核通过',
    });
  }

  if (row.pushTime) {
    const pushLabel = kingdeePushStatusLabels[row.kingdeePushStatus] || row.kingdeePushStatus;
    pushEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送金蝶',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : pushLabel || '推送金蝶',
    });
  }

  return mergeLogs(entries, row.operationLogs || []);
}

export function buildSalesOrderOperationLogs(row) {
  const entries = [];

  pushEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: '创建销售订单',
  });

  if (row.auditStatus === 'pending' || row.auditStatus === 'approved') {
    pushEntry(entries, {
      time: row.submittedAt || row.createdAt,
      operator: row.submitter || row.creator,
      action: '提交',
      remark: '提交审核',
    });
  }

  if (row.returnComment) {
    pushEntry(entries, {
      time: row.returnedAt || row.updatedAt,
      operator: row.returnOperator || row.updater,
      action: '撤回',
      remark: row.returnComment,
    });
  }

  if (row.auditStatus === 'approved' && row.auditTime) {
    pushEntry(entries, {
      time: row.auditTime,
      operator: row.auditor,
      action: '审核',
      remark: '审核通过并占库',
    });
  }

  if (row.businessStatus === 'cancelled') {
    pushEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }

  if (row.businessStatus === 'closed') {
    pushEntry(entries, {
      time: row.closeTime,
      operator: row.closeOperator,
      action: '关闭',
      remark: row.closeReason || (row.closeType === 'auto' ? '全部发货自动关单' : '手动关闭'),
    });
  }

  if (row.deliveryAdjustedAt) {
    pushEntry(entries, {
      time: row.deliveryAdjustedAt,
      operator: row.deliveryAdjustedBy || row.updater,
      action: '调整交期',
      remark: row.deliveryDate ? `交期调整为 ${row.deliveryDate}` : '调整交期',
    });
  }

  return mergeLogs(entries, row.operationLogs || []);
}

export function buildDeliveryNoticeOperationLogs(row) {
  const entries = [];

  pushEntry(entries, {
    time: row.createdAt,
    operator: row.creator,
    action: '创建',
    remark: row.deliveryMode === 'virtual' ? '下推创建销售发货通知单（虚拟出库）' : '下推创建销售发货通知单',
  });

  if (row.pushTime) {
    pushEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送仓库',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : '推送仓库成功',
    });
  }

  if (row.finalShipTime) {
    pushEntry(entries, {
      time: row.finalShipTime,
      operator: '系统',
      action: '发货完成',
      remark: row.deliveryMode === 'virtual' ? '按通知数量确认发货' : '仓库回传发货结果',
    });
  }

  if (row.status === 'cancelled') {
    pushEntry(entries, {
      time: row.cancelTime,
      operator: row.cancelOperator,
      action: '取消',
      remark: row.cancelReason,
    });
  }

  return mergeLogs(entries, row.operationLogs || []);
}

export function buildSalesOutboundOperationLogs(row) {
  const entries = [];

  pushEntry(entries, {
    time: row.createdAt,
    operator: row.creator || '系统',
    action: '生成',
    remark: '根据发货通知回传生成出库单',
  });

  if (row.auditTime) {
    pushEntry(entries, {
      time: row.auditTime,
      operator: row.auditor || '系统',
      action: '审核',
      remark: '自动审核通过',
    });
  }

  if (row.pushTime) {
    const pushLabel = kingdeePushStatusLabels[row.kingdeePushStatus] || row.kingdeePushStatus;
    pushEntry(entries, {
      time: row.pushTime,
      operator: '系统',
      action: '推送金蝶',
      remark: row.pushFailReason ? `推送失败：${row.pushFailReason}` : pushLabel || '推送金蝶',
    });
  }

  return mergeLogs(entries, row.operationLogs || []);
}
