/**
 * 用户与权限-功能权限点目录（主PRD §4.4）。
 *
 * 结构：一级菜单（一期七个，与侧边栏一致）→ 二级菜单（对象）→ 操作。
 * - 「查看」对所有二级菜单统一登记；「导出」按原型提供导出入口的菜单登记
 *   （用户与权限、导入中心、导出中心不提供导出入口，个人中心不配置权限点）。
 * - 权限点由系统预置，页面只做角色勾选，不支持新增、删除或改名（主PRD F03）。
 * - 操作名称沿用各模块已有叫法（提交、审核、驳回、撤回等），不另造叫法。
 */

const rawPermissionCatalog = [
  {
    id: 'base',
    label: '基础资料',
    objects: [
      { id: 'product', label: '商品资料', exportable: true, operations: ['新增', '编辑', '启用／禁用', '导入'] },
      { id: 'supplier', label: '供应商资料', exportable: true, operations: ['新增', '编辑', '提交', '审核', '反审核', '启用／禁用', '导入'] },
      { id: 'customer', label: '客户资料', exportable: true, operations: ['新增', '编辑', '提交', '审核', '反审核', '启用／禁用', '导入'] },
      { id: 'physicalWarehouse', label: '实体仓', exportable: true, operations: ['新增', '编辑', '提交', '审核', '反审核', '启用／禁用', '导入'] },
      { id: 'logicalWarehouse', label: '逻辑仓', exportable: true, operations: ['新增', '编辑', '提交', '审核', '反审核', '启用／禁用', '导入'] },
      { id: 'logisticsCarrier', label: '物流商', exportable: true, operations: ['新增', '编辑', '启用／禁用'] },
      { id: 'logisticsProduct', label: '物流服务产品', exportable: true, operations: ['新增', '编辑', '启用／禁用'] },
      { id: 'auxiliary', label: '辅助资料', exportable: true, operations: ['新增', '编辑', '删除', '启用／禁用', '导入'] },
    ],
  },
  {
    id: 'price',
    label: '价格管理',
    objects: [
      { id: 'purchasePriceList', label: '采购价目表', exportable: true, operations: [] },
      { id: 'salesPriceList', label: '销售价目表', exportable: true, operations: [] },
      { id: 'purchasePriceAdjust', label: '采购价格调整单', exportable: true, operations: ['新增', '编辑', '提交', '审核'] },
      { id: 'salesPriceAdjust', label: '销售价格调整单', exportable: true, operations: ['新增', '编辑', '提交', '审核'] },
    ],
  },
  {
    id: 'purchase',
    label: '采购管理',
    objects: [
      { id: 'purchaseOrder', label: '采购订单', exportable: true, operations: ['新增', '编辑', '提交', '审核', '撤回', '关闭', '取消', '下推收货通知'] },
      { id: 'purchaseReceiptNotice', label: '采购收货通知单', exportable: true, operations: ['申请取消', '重试推送', '人工确认'] },
      { id: 'purchaseInbound', label: '采购入库单', exportable: true, operations: [] },
      { id: 'purchaseReturn', label: '采购退货单', exportable: true, operations: ['新增', '编辑', '提交', '审核', '关闭', '取消'] },
      { id: 'purchaseReturnNotice', label: '采退发货通知单', exportable: true, operations: ['申请取消', '重试推送', '人工确认'] },
      { id: 'purchaseReturnOutbound', label: '采退出库单', exportable: true, operations: [] },
    ],
  },
  {
    id: 'sales',
    label: '销售管理',
    objects: [
      { id: 'salesOrder', label: '销售订单', exportable: true, operations: ['新增', '编辑', '提交', '审核', '撤回', '关闭', '取消', '下推发货通知'] },
      { id: 'salesDeliveryNotice', label: '销售发货通知单', exportable: true, operations: ['申请取消', '重试推送', '人工确认'] },
      { id: 'salesOutbound', label: '销售出库单', exportable: true, operations: [] },
      // 2C 渠道订单为拉取只读列表，原型未提供导出入口。
      { id: 'shopifyOrder', label: '独立站订单', exportable: false, operations: ['拉取订单', '审核', '取消审核', '人工确认'] },
      { id: 'domesticOrder', label: '国内电商订单', exportable: false, operations: [] },
      { id: 'crossborderOrder', label: '跨境电商订单', exportable: false, operations: [] },
      { id: 'salesReturn', label: '销售退货单', exportable: true, operations: ['新增', '编辑', '提交', '审核', '关闭', '取消'] },
      { id: 'salesReturnNotice', label: '销退收货通知单', exportable: true, operations: ['申请取消', '重试推送', '人工确认'] },
      { id: 'salesReturnInbound', label: '销退入库单', exportable: true, operations: [] },
    ],
  },
  {
    id: 'inventory',
    label: '库存管理',
    objects: [
      { id: 'stockQuery', label: '库存查询', exportable: true, operations: ['冻结', '解冻'] },
      { id: 'stockFlow', label: '库存流水', exportable: true, operations: [] },
      { id: 'otherInboundRequest', label: '其他入库申请单', exportable: true, operations: ['新增', '编辑', '删除', '提交', '审核', '撤回', '取消', '重试推送'] },
      { id: 'otherInbound', label: '其他入库单', exportable: true, operations: [] },
      { id: 'otherOutboundRequest', label: '其他出库申请单', exportable: true, operations: ['新增', '编辑', '删除', '提交', '审核', '撤回', '取消', '重试推送'] },
      { id: 'otherOutbound', label: '其他出库单', exportable: true, operations: [] },
      { id: 'transferOrder', label: '分步式调拨单', exportable: true, operations: ['新增', '编辑', '提交', '审核', '撤回', '取消'] },
      { id: 'transferOutNotice', label: '调出通知单', exportable: true, operations: ['重试推送'] },
      { id: 'transferInNotice', label: '调入通知单', exportable: true, operations: [] },
      { id: 'directTransfer', label: '直接调拨单', exportable: true, operations: ['新增', '审核'] },
      { id: 'inventoryCompare', label: '库存比对', exportable: true, operations: [] },
    ],
  },
  {
    id: 'integration',
    label: '系统集成',
    objects: [
      { id: 'financeResults', label: '业财结果单据', exportable: true, operations: ['重推', '异常运维重推'] },
      { id: 'pushExceptions', label: '推送异常', exportable: true, operations: [] },
    ],
  },
  {
    id: 'settings',
    label: '系统设置',
    objects: [
      { id: 'importCenter', label: '导入中心', exportable: false, operations: [] },
      { id: 'exportCenter', label: '导出中心', exportable: false, operations: [] },
      { id: 'users', label: '用户与权限', exportable: false, operations: ['账号管理', '角色管理', '功能权限配置', '数据权限配置'] },
      { id: 'profile', label: '个人中心', noPoints: true, note: '登录用户均可访问本人数据，不配置权限点' },
    ],
  },
];

function buildObject(groupId, object) {
  const objectKey = `${groupId}/${object.id}`;
  const pointLabels = object.noPoints
    ? []
    : ['查看', ...(object.exportable ? ['导出'] : []), ...(object.operations || [])];
  return {
    id: object.id,
    key: objectKey,
    label: object.label,
    noPoints: Boolean(object.noPoints),
    note: object.note || '',
    exportable: Boolean(object.exportable),
    operationLabels: object.operations || [],
    points: pointLabels.map((label) => ({ key: `${objectKey}/${label}`, label })),
    pointKeys: pointLabels.map((label) => `${objectKey}/${label}`),
  };
}

/** 三级勾选树数据：一级菜单 → 二级菜单（对象）→ 权限点（查看、导出、操作）。 */
export const permissionGroups = rawPermissionCatalog.map((group) => ({
  id: group.id,
  label: group.label,
  objects: group.objects.map((object) => buildObject(group.id, object)),
}));

export const allPermissionPointKeys = permissionGroups.flatMap((group) => group.objects.flatMap((object) => object.pointKeys));

export function getPermissionGroup(groupId) {
  return permissionGroups.find((group) => group.id === groupId) || null;
}

/**
 * 按「一级菜单 → 二级菜单对象」清单收集权限点（角色种子数据用）。
 * @param {Array<[string, string[]]>} menuRefs 形如 [['base', ['product', 'supplier']]]
 */
export function collectPermissionKeys(menuRefs = []) {
  const keys = [];
  menuRefs.forEach(([groupId, objectIds]) => {
    const group = getPermissionGroup(groupId);
    if (!group) return;
    (objectIds || []).forEach((objectId) => {
      const object = group.objects.find((item) => item.id === objectId);
      if (object) keys.push(...object.pointKeys);
    });
  });
  return keys;
}
