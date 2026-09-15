import { BarChart3, FileCog, LayoutDashboard, PackageOpen, Plug, ShoppingCart, Tags, Warehouse } from 'lucide-react';

/**
 * 侧边栏菜单结构。
 *
 * 基线是《系统与模块地图》附录《系统菜单结构与期次》：一级菜单、二级菜单的名称和顺序都照那里排。
 * 一级菜单没有二级菜单的（工作台）直接进首页；有二级菜单的用 groups 挂 flyout。
 * tag 只是标注「待确认」；后置菜单（消息与待办、参数配置、操作日志）不进菜单。
 * 顺序规则：业务模块按链路顺序排（订单／申请 → 通知 → 结果单），正向链在前、退货链在后；
 * 查询类在前，比对、映射这类低频或配置菜单在后。
 */
export const defaultNavItems = [
  { id: 'home', label: '工作台', icon: LayoutDashboard, tag: '待确认' },
  {
    id: 'base',
    label: '基础资料',
    icon: PackageOpen,
    groups: [
      {
        title: '基础资料',
        items: [
          { label: '商品资料', pageId: 'base-product' },
          { label: '供应商资料', pageId: 'base-supplier' },
          { label: '客户资料', pageId: 'base-customer' },
          { label: '仓库资料', pageId: 'warehouse-list' },
          { label: '物流资料', pageId: 'base-logistics' },
          { label: '辅助资料', pageId: 'base-auxiliary' },
        ],
      },
    ],
  },
  {
    id: 'price',
    label: '价格管理',
    icon: Tags,
    groups: [
      {
        title: '价格管理',
        items: [
          { label: '采购价目表', pageId: 'price-purchase-list' },
          { label: '销售价目表', pageId: 'price-sales-list' },
          { label: '采购价格调整单', pageId: 'price-purchase-adjust' },
          { label: '销售价格调整单', pageId: 'price-sales-adjust' },
        ],
      },
    ],
  },
  {
    id: 'purchase',
    label: '采购管理',
    icon: ShoppingCart,
    groups: [
      {
        title: '采购正向',
        items: [
          { label: '采购订单', pageId: 'purchase-order' },
          { label: '采购收货通知单', pageId: 'purchase-receipt-notice' },
          { label: '采购入库单', pageId: 'purchase-inbound' },
        ],
      },
      {
        title: '采购退货',
        items: [
          { label: '采购退货单', pageId: 'purchase-return' },
          { label: '采退发货通知单', pageId: 'purchase-return-notice' },
          { label: '采退出库单', pageId: 'purchase-return-outbound' },
        ],
      },
    ],
  },
  {
    id: 'sales',
    label: '销售管理',
    icon: BarChart3,
    groups: [
      {
        title: 'B2B 渠道',
        items: [
          { label: '销售订单', pageId: 'sales-order' },
          { label: '销售发货通知单', pageId: 'sales-delivery-notice' },
          { label: '销售出库单', pageId: 'sales-outbound' },
        ],
      },
      {
        title: '2C 渠道',
        items: [
          { label: '独立站订单', pageId: 'sales-shopify-order' },
          { label: '外部电商订单', pageId: 'sales-external-order' },
        ],
      },
      {
        title: '退货',
        items: [
          { label: '销售退货单', pageId: 'sales-return' },
          { label: '销退收货通知单', pageId: 'sales-return-notice' },
          { label: '销退入库单', pageId: 'sales-return-inbound' },
        ],
      },
    ],
  },
  {
    id: 'inventory',
    label: '库存管理',
    icon: Warehouse,
    groups: [
      {
        title: '查询',
        items: [
          { label: '库存查询', pageId: 'inventory-stock-query' },
          { label: '库存流水', pageId: 'inventory-stock-flow', tag: '待确认' },
        ],
      },
      {
        title: '其他出入库',
        items: [
          { label: '其他入库申请单', pageId: 'inventory-other-inbound-request' },
          { label: '其他入库单', pageId: 'inventory-other-inbound' },
          { label: '其他出库申请单', pageId: 'inventory-other-outbound-request' },
          { label: '其他出库单', pageId: 'inventory-other-outbound' },
        ],
      },
      {
        title: '调拨',
        items: [
          { label: '分步式调拨单', pageId: 'inventory-transfer-order' },
          { label: '调出通知单', pageId: 'inventory-transfer-out-notice' },
          { label: '调入通知单', pageId: 'inventory-transfer-in-notice' },
          { label: '直接调拨单', pageId: 'inventory-direct-transfer' },
        ],
      },
      {
        title: '比对',
        items: [
          { label: '库存比对', pageId: 'inventory-compare' },
        ],
      },
    ],
  },
  {
    id: 'integration',
    label: '系统集成',
    icon: Plug,
    groups: [
      {
        title: '系统集成',
        items: [
          { label: '业财结果单据', pageId: 'integration-finance-results' },
          { label: '推送异常', pageId: 'integration-push-exceptions' },
          { label: '人工补充', pageId: 'integration-manual-supplement' },
          { label: '外部映射', pageId: 'integration-mapping' },
        ],
      },
    ],
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: FileCog,
    groups: [
      {
        title: '数据',
        items: [
          { label: '导入中心', pageId: 'import-center' },
          { label: '导出中心', pageId: 'export-center', tag: '待确认' },
        ],
      },
      {
        title: '账号与权限',
        items: [
          { label: '用户与权限', pageId: 'settings-users' },
          { label: '个人中心', pageId: 'profile', tag: '待确认' },
        ],
      },
    ],
  },
];
