/**
 * 库存模块共享演示数据。
 *
 * 库存余额行、预占来源记录、库存流水、库存比对结果是同一套「逻辑仓＋商品」数据的不同视角：
 * 余额看当前值，流水看变动过程，比对按实体仓＋商品＋库存状态汇总。
 * 冻结、解冻、结果单记账都通过 `lib/inventoryStockLogic.js` 写入，不在这里单独维护状态。
 *
 * 说明：本文件是演示用 Mock 数据，数量与单号为虚构；口径见
 * 《库存查询主PRD》《库存流水主PRD》《库存比对主PRD》与各自字段清单。
 */

// —— 库存余额种子（逻辑仓＋商品）——
export const stockRowSeeds = [
  // INV-AC01 示例：即时100、预占60、冻结10、可用30
  { id: 'stock-001', logicalWarehouse: 'LWH000001', product: 'SP0101010001', instantQty: 100, reservedQty: 60, frozenQty: 10, updatedAt: '2026-09-23 10:20:00' },
  { id: 'stock-002', logicalWarehouse: 'LWH000001', product: 'SP0101020001', instantQty: 240, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-22 16:05:00' },
  { id: 'stock-003', logicalWarehouse: 'LWH000001', product: 'SP0101030001', instantQty: 36, reservedQty: 12, frozenQty: 0, updatedAt: '2026-09-23 09:40:00' },
  { id: 'stock-004', logicalWarehouse: 'LWH000002', product: 'SP0101020001', instantQty: 20, reservedQty: 0, frozenQty: 5, updatedAt: '2026-09-23 11:05:00' },
  // 同一实体仓（WH000001）下两个相同库存状态的逻辑仓
  { id: 'stock-005', logicalWarehouse: 'LWH000005', product: 'SP0101010001', instantQty: 40, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-21 14:30:00' },
  { id: 'stock-006', logicalWarehouse: 'LWH000005', product: 'SP0102010001', instantQty: 8, reservedQty: 8, frozenQty: 0, updatedAt: '2026-09-23 09:05:00' },
  { id: 'stock-015', logicalWarehouse: 'LWH000005', product: 'SP0101030001', instantQty: 16, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-22 09:30:00' },
  { id: 'stock-007', logicalWarehouse: 'LWH000006', product: 'SP0103010001', instantQty: 15, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-20 17:10:00' },
  // 全 0 行：用于验证「展示为0的库存数据」勾选框
  { id: 'stock-008', logicalWarehouse: 'LWH000006', product: 'SP0101010001', instantQty: 0, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-19 10:00:00' },
  { id: 'stock-009', logicalWarehouse: 'LWH000007', product: 'SP0102020001', instantQty: 22, reservedQty: 4, frozenQty: 2, updatedAt: '2026-09-22 11:25:00' },
  // 已禁用逻辑仓仍有存量
  { id: 'stock-010', logicalWarehouse: 'LWH000008', product: 'SP0103020001', instantQty: 18, reservedQty: 0, frozenQty: 3, updatedAt: '2026-09-18 15:45:00' },
  // 虚拟在途仓：即时＝在途数量
  { id: 'stock-011', logicalWarehouse: 'LWH000009', product: 'SP0101010001', instantQty: 90, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-23 10:20:00' },
  { id: 'stock-012', logicalWarehouse: 'LWH000009', product: 'SP0101030001', instantQty: 0, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-22 09:30:00' },
  { id: 'stock-013', logicalWarehouse: 'LWH000004', product: 'SP0102010001', instantQty: 6, reservedQty: 0, frozenQty: 0, updatedAt: '2026-09-13 08:40:00' },
  { id: 'stock-014', logicalWarehouse: 'LWH000002', product: 'SP0103020001', instantQty: 30, reservedQty: 6, frozenQty: 0, updatedAt: '2026-09-22 16:20:00' },
];

/**
 * 预占来源记录：列出「哪个来源单据的哪一行」占用了该逻辑仓＋商品的数量。
 * 来源类型沿用《预占与冻结主PRD》F01 的占用来源（销售、采购退货、分步式调拨、其他出库）。
 */
export const stockReservationSeeds = [
  { id: 'res-001', logicalWarehouse: 'LWH000001', product: 'SP0101010001', sourceType: '分步式调拨单', sourceNo: 'FBDB-20260923-0003', sourceLineNo: 1, reservedQty: 40, consumedQty: 0, releasedQty: 0, status: 'active', createdAt: '2026-09-23 08:30:00' },
  { id: 'res-002', logicalWarehouse: 'LWH000001', product: 'SP0101010001', sourceType: '其他出库申请单', sourceNo: 'QTCKSQ-20260923-0001', sourceLineNo: 1, reservedQty: 20, consumedQty: 0, releasedQty: 0, status: 'active', createdAt: '2026-09-23 09:10:00' },
  { id: 'res-003', logicalWarehouse: 'LWH000001', product: 'SP0101030001', sourceType: '分步式调拨单', sourceNo: 'FBDB-20260923-0001', sourceLineNo: 3, reservedQty: 12, consumedQty: 0, releasedQty: 0, status: 'active', createdAt: '2026-09-23 08:50:00' },
  { id: 'res-004', logicalWarehouse: 'LWH000005', product: 'SP0102010001', sourceType: '销售订单', sourceNo: 'XSDD-20260923-0002', sourceLineNo: 1, reservedQty: 8, consumedQty: 0, releasedQty: 0, status: 'active', createdAt: '2026-09-23 09:05:00' },
  { id: 'res-005', logicalWarehouse: 'LWH000007', product: 'SP0102020001', sourceType: '其他出库申请单', sourceNo: 'QTCKSQ-20260923-0002', sourceLineNo: 1, reservedQty: 4, consumedQty: 0, releasedQty: 0, status: 'active', createdAt: '2026-09-22 10:40:00' },
  { id: 'res-006', logicalWarehouse: 'LWH000002', product: 'SP0103020001', sourceType: '采购退货单', sourceNo: 'CCTH-20260922-0001', sourceLineNo: 2, reservedQty: 6, consumedQty: 0, releasedQty: 0, status: 'active', createdAt: '2026-09-22 15:30:00' },
  // 已执行完毕的预占：只为流水核对保留，不计入当前预占数量
  { id: 'res-101', logicalWarehouse: 'LWH000001', product: 'SP0101010001', sourceType: '分步式调拨单', sourceNo: 'FBDB-20260922-0003', sourceLineNo: 1, reservedQty: 100, consumedQty: 90, releasedQty: 10, status: 'closed', createdAt: '2026-09-22 08:40:00' },
  { id: 'res-103', logicalWarehouse: 'LWH000005', product: 'SP0102010001', sourceType: '销售订单', sourceNo: 'XSDD-20260918-0005', sourceLineNo: 1, reservedQty: 8, consumedQty: 8, releasedQty: 0, status: 'closed', createdAt: '2026-09-18 09:00:00' },
  { id: 'res-102', logicalWarehouse: 'LWH000001', product: 'SP0101030001', sourceType: '其他出库申请单', sourceNo: 'QTCKSQ-20260922-0001', sourceLineNo: 1, reservedQty: 20, consumedQty: 12, releasedQty: 8, status: 'closed', createdAt: '2026-09-22 09:20:00' },
];

const flowSeedBase = {
  sourceType: '',
  sourceNo: '',
  businessType: '',
  operator: '系统',
};

/**
 * 库存流水种子：一行一次变动，含结果单记账与人工冻结、解冻。
 * 四组变动明细按「前 → 后（变动）」表达；预占组反映该次事件对预占的影响（消耗记负、释放记正）。
 */
export const stockFlowSeeds = [
  {
    ...flowSeedBase,
    id: 'flow-019',
    time: '2026-09-23 09:05:00',
    eventType: 'result_out',
    logicalWarehouse: 'LWH000005',
    product: 'SP0102010001',
    instantBefore: 16, instantChange: -8, instantAfter: 8,
    availableBefore: 0, availableChange: 0, availableAfter: 0,
    reservedBefore: 16, reservedChange: -8, reservedAfter: 8,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '销售出库单', sourceNo: 'XSCK-20260918-0001',
  },
  {
    ...flowSeedBase,
    id: 'flow-001',
    time: '2026-09-23 10:20:00',
    eventType: 'result_in',
    logicalWarehouse: 'LWH000009',
    product: 'SP0101010001',
    instantBefore: 0, instantChange: 90, instantAfter: 90,
    availableBefore: 0, availableChange: 90, availableAfter: 90,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '直接调拨单', sourceNo: 'ZJDB-20260923-0001',
  },
  {
    ...flowSeedBase,
    id: 'flow-002',
    time: '2026-09-23 10:20:00',
    eventType: 'result_out',
    logicalWarehouse: 'LWH000001',
    product: 'SP0101010001',
    instantBefore: 190, instantChange: -90, instantAfter: 100,
    availableBefore: 20, availableChange: 10, availableAfter: 30,
    reservedBefore: 160, reservedChange: -100, reservedAfter: 60,
    frozenBefore: 10, frozenChange: 0, frozenAfter: 10,
    sourceType: '直接调拨单', sourceNo: 'ZJDB-20260923-0001',
  },
  {
    ...flowSeedBase,
    id: 'flow-003',
    time: '2026-09-23 09:10:00',
    eventType: 'result_out',
    logicalWarehouse: 'LWH000002',
    product: 'SP0101020001',
    instantBefore: 90, instantChange: -70, instantAfter: 20,
    availableBefore: 40, availableChange: -25, availableAfter: 15,
    reservedBefore: 45, reservedChange: -45, reservedAfter: 0,
    frozenBefore: 5, frozenChange: 0, frozenAfter: 5,
    sourceType: '其他出库单', sourceNo: 'QTCK-20260923-0001',
    businessType: '报废',
  },
  {
    ...flowSeedBase,
    id: 'flow-004',
    time: '2026-09-23 09:40:00',
    eventType: 'result_out',
    logicalWarehouse: 'LWH000001',
    product: 'SP0101030001',
    instantBefore: 48, instantChange: -12, instantAfter: 36,
    availableBefore: 16, availableChange: 8, availableAfter: 24,
    reservedBefore: 32, reservedChange: -20, reservedAfter: 12,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '其他出库单', sourceNo: 'QTCK-20260922-0001',
    businessType: '盘亏',
  },
  {
    ...flowSeedBase,
    id: 'flow-005',
    time: '2026-09-23 11:05:00',
    eventType: 'freeze',
    logicalWarehouse: 'LWH000004',
    product: 'SP0102010001',
    instantBefore: 6, instantChange: 0, instantAfter: 6,
    availableBefore: 6, availableChange: -4, availableAfter: 2,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 4, frozenAfter: 4,
    sourceType: '', sourceNo: '', operator: '陈小梦CXM',
  },
  {
    ...flowSeedBase,
    id: 'flow-006',
    time: '2026-09-23 11:05:00',
    eventType: 'unfreeze',
    logicalWarehouse: 'LWH000004',
    product: 'SP0102010001',
    instantBefore: 6, instantChange: 0, instantAfter: 6,
    availableBefore: 2, availableChange: 4, availableAfter: 6,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 4, frozenChange: -4, frozenAfter: 0,
    sourceType: '', sourceNo: '', operator: '陈小梦CXM',
  },
  {
    ...flowSeedBase,
    id: 'flow-007',
    time: '2026-09-22 16:05:00',
    eventType: 'result_in',
    logicalWarehouse: 'LWH000001',
    product: 'SP0101020001',
    instantBefore: 200, instantChange: 40, instantAfter: 240,
    availableBefore: 200, availableChange: 40, availableAfter: 240,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '采购入库单', sourceNo: 'CGRK-20260922-0003',
  },
  {
    ...flowSeedBase,
    id: 'flow-008',
    time: '2026-09-22 10:00:00',
    eventType: 'result_out',
    logicalWarehouse: 'LWH000001',
    product: 'SP0101020001',
    instantBefore: 240, instantChange: -40, instantAfter: 200,
    availableBefore: 240, availableChange: -40, availableAfter: 200,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '采退出库单', sourceNo: 'CCTCK-20260922-0001',
  },
  {
    ...flowSeedBase,
    id: 'flow-009',
    time: '2026-09-22 11:25:00',
    eventType: 'result_in',
    logicalWarehouse: 'LWH000007',
    product: 'SP0102020001',
    instantBefore: 12, instantChange: 10, instantAfter: 22,
    availableBefore: 6, availableChange: 10, availableAfter: 16,
    reservedBefore: 4, reservedChange: 0, reservedAfter: 4,
    frozenBefore: 2, frozenChange: 0, frozenAfter: 2,
    sourceType: '其他入库单', sourceNo: 'QTRK-20260922-0002',
    businessType: '样品回收',
  },
  {
    ...flowSeedBase,
    id: 'flow-010',
    time: '2026-09-22 09:30:00',
    eventType: 'result_out',
    logicalWarehouse: 'LWH000009',
    product: 'SP0101030001',
    instantBefore: 16, instantChange: -16, instantAfter: 0,
    availableBefore: 16, availableChange: -16, availableAfter: 0,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '直接调拨单', sourceNo: 'ZJDB-20260922-0002',
  },
  {
    ...flowSeedBase,
    id: 'flow-011',
    time: '2026-09-22 09:30:00',
    eventType: 'result_in',
    logicalWarehouse: 'LWH000005',
    product: 'SP0101030001',
    instantBefore: 0, instantChange: 16, instantAfter: 16,
    availableBefore: 0, availableChange: 16, availableAfter: 16,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '直接调拨单', sourceNo: 'ZJDB-20260922-0002',
  },
  {
    ...flowSeedBase,
    id: 'flow-012',
    time: '2026-09-21 14:30:00',
    eventType: 'result_in',
    logicalWarehouse: 'LWH000005',
    product: 'SP0101010001',
    instantBefore: 0, instantChange: 40, instantAfter: 40,
    availableBefore: 0, availableChange: 40, availableAfter: 40,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '销退入库单', sourceNo: 'XTRK-20260921-0001',
  },
  {
    ...flowSeedBase,
    id: 'flow-013',
    time: '2026-09-22 11:15:00',
    eventType: 'freeze',
    logicalWarehouse: 'LWH000007',
    product: 'SP0102020001',
    instantBefore: 22, instantChange: 0, instantAfter: 22,
    availableBefore: 18, availableChange: -2, availableAfter: 16,
    reservedBefore: 4, reservedChange: 0, reservedAfter: 4,
    frozenBefore: 0, frozenChange: 2, frozenAfter: 2,
    sourceType: '', sourceNo: '', operator: '韩佩奇HPQ',
  },
  {
    ...flowSeedBase,
    id: 'flow-014',
    time: '2026-09-20 17:10:00',
    eventType: 'result_in',
    logicalWarehouse: 'LWH000006',
    product: 'SP0103010001',
    instantBefore: 5, instantChange: 10, instantAfter: 15,
    availableBefore: 5, availableChange: 10, availableAfter: 15,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '其他入库单', sourceNo: 'QTRK-20260920-0001',
    businessType: '盘盈',
  },
  {
    ...flowSeedBase,
    id: 'flow-015',
    time: '2026-09-18 15:45:00',
    eventType: 'result_in',
    logicalWarehouse: 'LWH000008',
    product: 'SP0103020001',
    instantBefore: 0, instantChange: 18, instantAfter: 18,
    availableBefore: 0, availableChange: 18, availableAfter: 18,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 0, frozenAfter: 0,
    sourceType: '其他入库单', sourceNo: 'QTRK-20260918-0001',
    businessType: '借出归还',
  },
  {
    ...flowSeedBase,
    id: 'flow-016',
    time: '2026-09-18 16:20:00',
    eventType: 'freeze',
    logicalWarehouse: 'LWH000008',
    product: 'SP0103020001',
    instantBefore: 18, instantChange: 0, instantAfter: 18,
    availableBefore: 18, availableChange: -3, availableAfter: 15,
    reservedBefore: 0, reservedChange: 0, reservedAfter: 0,
    frozenBefore: 0, frozenChange: 3, frozenAfter: 3,
    sourceType: '', sourceNo: '', operator: '韩佩奇HPQ',
  },
  {
    ...flowSeedBase,
    id: 'flow-017',
    time: '2026-09-22 16:00:00',
    eventType: 'freeze',
    logicalWarehouse: 'LWH000002',
    product: 'SP0103020001',
    instantBefore: 30, instantChange: 0, instantAfter: 30,
    availableBefore: 24, availableChange: -3, availableAfter: 21,
    reservedBefore: 6, reservedChange: 0, reservedAfter: 6,
    frozenBefore: 0, frozenChange: 3, frozenAfter: 3,
    sourceType: '', sourceNo: '', operator: '张廷ZT',
  },
  {
    ...flowSeedBase,
    id: 'flow-018',
    time: '2026-09-22 17:10:00',
    eventType: 'unfreeze',
    logicalWarehouse: 'LWH000002',
    product: 'SP0103020001',
    instantBefore: 30, instantChange: 0, instantAfter: 30,
    availableBefore: 21, availableChange: 3, availableAfter: 24,
    reservedBefore: 6, reservedChange: 0, reservedAfter: 6,
    frozenBefore: 3, frozenChange: -3, frozenAfter: 0,
    sourceType: '', sourceNo: '', operator: '张廷ZT',
  },
];

/**
 * 库存比对种子：一行＝实体仓＋商品＋库存状态。每天自动比对一次（演示两个批次）。
 * 仓库数量来自仓库库存快照；单边缺失口径待确认（库存比对主PRD Q03），本期不构造缺失行。
 */
export const stockCompareSeeds = [
  {
    id: 'compare-0923-01', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0101010001', stockStatus: 'normal',
    erpQty: 140, warehouseQty: 138, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-02', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0101020001', stockStatus: 'normal',
    erpQty: 240, warehouseQty: 240, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-03', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0101020001', stockStatus: 'defective',
    erpQty: 20, warehouseQty: 23, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-04', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0101030001', stockStatus: 'normal',
    erpQty: 52, warehouseQty: 48, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-05', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0102010001', stockStatus: 'normal',
    erpQty: 8, warehouseQty: 11, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-06', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0103010001', stockStatus: 'inspection',
    erpQty: 15, warehouseQty: 15, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-07', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0103020001', stockStatus: 'defective',
    erpQty: 30, warehouseQty: 30, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-08', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000002', product: 'SP0102020001', stockStatus: 'inspection',
    erpQty: 22, warehouseQty: 22, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-09', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000002', product: 'SP0103020001', stockStatus: 'defective',
    erpQty: 18, warehouseQty: 0, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-10', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000002', product: 'SP0101010001', stockStatus: 'normal',
    erpQty: 0, warehouseQty: 2, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-11', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000005', product: 'SP0102010001', stockStatus: 'normal',
    erpQty: 6, warehouseQty: 6, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0923-12', compareTime: '2026-09-23 02:00:00', physicalWarehouse: 'WH000003', product: 'SP0101010001', stockStatus: 'normal',
    erpQty: 0, warehouseQty: 0, snapshotTime: '2026-09-23 01:30:00',
  },
  {
    id: 'compare-0922-01', compareTime: '2026-09-22 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0101010001', stockStatus: 'normal',
    erpQty: 160, warehouseQty: 160, snapshotTime: '2026-09-22 01:30:00',
  },
  {
    id: 'compare-0922-02', compareTime: '2026-09-22 02:00:00', physicalWarehouse: 'WH000001', product: 'SP0101020001', stockStatus: 'normal',
    erpQty: 240, warehouseQty: 236, snapshotTime: '2026-09-22 01:30:00',
  },
  {
    id: 'compare-0922-03', compareTime: '2026-09-22 02:00:00', physicalWarehouse: 'WH000002', product: 'SP0102020001', stockStatus: 'inspection',
    erpQty: 12, warehouseQty: 14, snapshotTime: '2026-09-22 01:30:00',
  },
  {
    id: 'compare-0922-04', compareTime: '2026-09-22 02:00:00', physicalWarehouse: 'WH000005', product: 'SP0102010001', stockStatus: 'normal',
    erpQty: 6, warehouseQty: 6, snapshotTime: '2026-09-22 01:30:00',
  },
];

// —— 枚举（与字段清单一致，页面只引用这里，不另立第二套取值）——

export const stockEventTypeLabels = {
  result_in: '结果单入库',
  result_out: '结果单出库',
  freeze: '冻结',
  unfreeze: '解冻',
};

export const stockDirectionLabels = {
  increase: '增加',
  decrease: '减少',
};

/** 七类已审核结果单（库存流水主PRD R04） */
export const stockSourceTypeLabels = {
  purchase_inbound: '采购入库单',
  purchase_return_outbound: '采退出库单',
  sales_outbound: '销售出库单',
  sales_return_inbound: '销退入库单',
  other_inbound: '其他入库单',
  other_outbound: '其他出库单',
  direct_transfer: '直接调拨单',
};

export const otherInboundBusinessTypeLabels = {
  gain: '盘盈',
  sample_return: '样品回收',
  loan_return: '借出归还',
  material_return: '退料',
  gift_inbound: '赠品入库',
};

export const otherOutboundBusinessTypeLabels = {
  loss: '盘亏',
  sample_use: '样品领用',
  gift: '赠送',
  scrap: '报废',
  loan_out: '借出',
};

/** 库存比对差异方向（库存比对主PRD R04） */
export const compareDirectionLabels = {
  none: '无差异',
  erp_more: 'ERP多',
  warehouse_more: '仓库多',
};

/** 冻结、解冻原因长度按 REMARK_500（《6.强盛ERP的编码规则和通用字段规则》） */
export const REMARK_500_MAX = 500;
