# 产品原型 · 开工须知

适用范围：`09-产品原型/`（React + Vite + Tailwind 演示原型，不接后端）。需求、字段与业务规则看 01–03，这里不重复。

## 工作方式

- 能自己起服务就自己起：`npm run dev` 后在浏览器里自检，不要把启动命令丢给用户。
- 视觉以参考截图或线上原型为准：布局、密度、间距、颜色、字体、可见内容与层级都按它来。
- 只把跨页面、可复用的规则写进本文件；一次性决定留在对应页面或数据文件，不写成长日志。
- 原型与已确认口径不一致的地方记在 `待改项.md`，动相关页面前先看它。
- UI 写在 `src/`；保持 `.openai/hosting.json`、`worker/index.js`、`scripts/prepare-sites-build.mjs`、`tests/sites-worker.test.mjs` 不动。

## 前端规范

- 字体与对比度：正文和控件保持 12px 紧凑型（compact），不放大字号解决对比度。可读文本统一用深墨蓝 `text-erp-text`（正文、表头、表单标签、批量操作按钮、首页卡片正文），灰色（`text-erp-text-muted`）只用于分页计数、占位、禁用等次要信息；语义色文字已加暗到 ≥4.5:1，亮色只用于填充、边框、圆点和图表，新增颜色按实际背景实测。禁用态文字用 `text-erp-disabled`，不复用 `text-erp-text-muted`。
- 空值占位：列表、详情、明细表等未填写字段统一显示 `-`（英文连字符），不用中文破折号 `—`；统一用 `lib/format.js` 的 `EMPTY_PLACEHOLDER` / `formatEmpty`。数量、金额的 `0` 按有效值展示。
- 系统记录字段展示名：创建人、创建时间、**最后更新人**、**最后更新时间**（不用「更新人」「更新时间」）；见《6.强盛ERP的编码规则和通用字段规则》第三节。制单信息用 `buildCreateMetaFields`。
- 主题：`data-theme` 挂 `documentElement`，弹层／下拉／弹窗／Toast 才能跟随主题；顶栏用 `--erp-header-gradient` 渐变（随主题微调）；左侧菜单固定近黑中性色（`--erp-sidebar-solid: #1f232e`，hover／边框／弹出层从它混出，不随主题换底），只有选中项 `--erp-sidebar-active-solid` 跟主题主色（配白字）；主按钮用主题主色（默认精工蓝，不用金蝶的绿色）；主题清单在 `styles/tokens.js`，新增主题在 `styles.css` 补 brand／hover／selected／active-solid／表头渐变并实测对比度（文字 ≥4.5:1、选中块与侧栏底 ≥2:1、hover 与底 ≥1.4:1）；图表等装饰色走 `rgb(var(--erp-brand-500))`，不硬编码。
- 控件样式：业务字段用仅保留底边框的底线样式；明细表格内输入框和下拉用完整边框；分页页码与条数选择器保留完整边框；禁用控件不用灰背景。
- 明细与栅格：合计行紧凑、汇总值落在对应列下、金额适度加粗；基础信息普通字段占 1 列、备注占 3 列且单行高度；数字输入框隐藏原生步进器。
- 查询区：搜索字段是纯输入框（`FilterControl` 已统一），不加放大镜等图标，页面配置不传 `trailingIcon`；有值后 hover 出现清除按钮。业务单据列表的并列状态筛选项（审核状态、业务状态、收货/发货状态等）用 `type: 'multi-select'`，初值 `[]`、未选等同全部；过滤用 `matchesMultiSelect`（`lib/options.js`）。
- 下拉弹层：宽度按内容自适应（`SelectContent` 已统一）——最窄对齐触发器、最宽 560px 且不出屏、选项单行；不要写死成触发器宽度。
- 列表交互：重置只还原筛选和选中，不改列显隐；页码可清空编辑，失焦或越界回合法页；操作列宽按当前页各行可见按钮文案估算（无「更多」时不预留更多位），表头与行内按钮左对齐，按钮 `px-1`、`gap-1.5`；配置 `rowActionsMaxVisible: 3` 时最多直出 3 个按钮，其余进「更多」下拉；表格横向滚动条用 `.table-scroll` 细滚动条（6px），不用全局粗滚动条；列表默认不限日期，保证新单保存后可见。列表页内 Tab 用 `InnerTabs` 默认 `underline` 变体（下划线、40px 行高），位置在表格卡片顶部、批量操作栏之上；用了 Tab 就不再在筛选区重复放同一状态字段。详情页卡片内切换用 `InnerTabs` 的 `pill` 变体（胶囊），见「详情页标准接线」。
- 批量操作栏：左侧默认只展示「已选中 N 条」；导入导出放页头（`ImportExportActions`），导出可选全部／当前筛选／已勾选。主数据列表可做批量提交审核（如仓库档案）；业务单据列表一期以行内操作为主，批量栏不放删除、取消、关闭等——状态与校验因单而异，取消关闭还须逐单填原因。
- 排序：只给日期、金额、数量这类可比较的列开排序，文本列（单号、供应商等）不排序；排序图标同族，未排序显示上下两个箭头，升／降序显示单个箭头（`DataTable` 已统一）。
- 列设置：面板支持搜索列名、勾选显隐、拖动排序、图钉固定左侧、恢复默认（`ColumnSettings` 已统一）；固定列吸附在勾选列之后，右侧操作列保持固定；列宽拖拽和右键自适应留在表头。
- 配色基线（对齐金蝶 tf.jdy.com 实测）：画布 `#EBEDF1`、表头 `#F6F6FB`、数据行 `#FFFFFF`（不做斑马纹）、行线 `#D2D0E4`、列线 `#E8E9EB`；可读文字（含 Tab 未选中）`#07073F`，次级灰 `#66667F`（顶栏浅色渐变上按最深处实测 ≥4.5:1），输入占位 `#555871`，禁用 `#787A94`。语义色色相向金蝶靠（橙 `#B85700`、绿 `#2A8003`、红 `#D42626`），但必须保持 ≥4.5:1。
- 列表框架尺寸：页面标题行 48px；表格卡片内 Tab 行 40px、批量操作行 48px、分页行 48px（`InnerTabs`／`BulkActionBar`／`PaginationBar` 已统一）。Tab（`px-3`）选中态只用加粗文字 + 2px 下划线，不加背景色；下划线要压在 Tab 行底线上：底线用容器的 inset box-shadow（`shadow-[inset_0_-1px_0_rgb(var(--erp-border-default))]`）画并给容器留 `pb-px`，让按钮不占满底线、hover 背景盖不到线，指示线用 `-bottom-px` 探出按钮盖住底线；Tab 行用 `px-1 gap-3`，首项文字与下方批量操作栏的「已选中」左对齐。批量操作用纯文字按钮（12px、常规字重、无图标、不加边框，默认次级文字色、悬停出浅底，危险操作用红色文字），按钮之间用 12px 高的 `bg-erp-border-light` 浅色竖线分隔（`已选中 X 条` 之后也要有分隔线）；行内操作保持文字链接。注意 erp 颜色里默认边框的类名是 `border-erp-border`，没有 `border-default` 后缀。
- 表单：所有输入都要有可访问名称（`FormControl` 管基础信息、`LineItemTable` 管明细）；拒绝负数单价（`lib/validation.js` 的 `hasNegativePrice`）；字段默认值不得与列表默认筛选冲突。**新增/创建页页头不展示流程状态标签**（`DocumentFormPage` 默认已拦截）。**表单校验**见下方「表单页标准接线」与[《UI布局公共说明》](../05-常用模板/02-模块设计交付/UI布局公共说明.md)。
- 主数据：供应商、仓库、员工、部门、SKU 等选项只从 `src/data/masterData.js` 取，页面和筛选不另建。供应商、客户、仓库、商品等带编码主数据的展示与下拉选项统一用 Code-Name（`{编码} {名称}`），见《6.强盛ERP的编码规则和通用字段规则》2.3。
- Mock 数据：写入 `localStorage`，刷新保留；单据间的关联选项从本地 Mock 集合读取。

## 列表页标准接线

新列表页优先**配置**已有组件，不要在页面里重复实现表格、批量栏、列设置、操作列溢出等。业务单据列表以 `PurchaseOrderListPage.jsx` 为样板。

### 已封装（页面不用重做）

| 能力 | 组件 / 样式 | 说明 |
| --- | --- | --- |
| 整页框架 | `DocumentListPage` → `ListPageFrame` | 查询、表格、分页、选中态一次接线 |
| 表格 | `DataTable` | 勾选列、列宽拖拽、排序、右键复制；操作列宽按当前页按钮文案估算；`rowActionsMaxVisible` +「更多」+ `ChevronDown` |
| 行内操作 | `rowActions` + `visibleWhen` | 按状态互斥展示；确认框用 action.`confirm`；危险操作用 `variant: 'danger'` |
| 批量栏 | `BulkActionBar` | 业务单据 `toolbarActions: []` 即可；主数据再配批量审核等 |
| 导入导出 | `ImportExportActions` | 放 `headerActions`；`scopeSource` 传 all / filtered / selected |
| 筛选控件 | `FilterControl` | `select` / `multi-select` / `date-range` / `search` 等 |
| 空值展示 | `EMPTY_PLACEHOLDER`、`DetailField` | 统一 `-`，见 `lib/format.js` |
| 细滚动条 | `.table-scroll` | 列表 `DataTable`、明细 `LineItemTable` 等表格横向滚动 6px |

### 页面只需提供

1. **数据**：`src/data/*` 列定义、状态字典、`filterRows`。
2. **列表 config**（传给 `DocumentListPage`）：`filterFields`、`initialFilters`、`columns`、`rowActions`、`rowActionsMaxVisible`（业务单据常用 3）、`headerActions`、`toolbarActions`。
3. **业务规则**：`*Logic.js` 里的 `canXxx(row)`，供 `visibleWhen` 引用；行操作处理函数 + 模块级 `*ActionDialogs.jsx`。
4. **弹窗**：列表页外包一层 `*ActionDialogs`，`onRowAction` 打开 dialog，不在列表里散写确认逻辑。

### 常用片段

```js
// 并列状态筛选项（审核 / 业务 / 收货或发货）
import { matchesMultiSelect, statusMultiSelectField } from '../lib/listFilters.js';

const initialFilters = { auditStatus: [], businessStatus: [], receiveStatus: [], /* ... */ };
const filterFields = [
  statusMultiSelectField('auditStatus', '审核状态', orderStatusLabels.auditStatus),
  // ...
];

function filterRows(row, filters) {
  return matchesMultiSelect(row.auditStatus, filters.auditStatus)
    && matchesMultiSelect(row.businessStatus, filters.businessStatus);
}
```

```js
// 业务单据列表批量栏与行操作
toolbarActions: [],
rowActionsMaxVisible: 3,
rowActions: [
  { id: 'edit', label: '编辑', visibleWhen: (row) => canEdit(row) },
  // 按使用频率排列；互斥状态用 visibleWhen，不要全挂再 disabled
],
```

文档侧同步：[《UI布局公共说明》](../05-常用模板/02-模块设计交付/UI布局公共说明.md)、列表 Demo PRD 模板、`04-产品设计方案/AGENTS.md`。

## 表单页标准接线

走 `DocumentFormPage` 的单据新增/编辑页，优先**配置**已有校验与报错能力，不要在页面里重复写 Toast 汇总。

### 已封装（页面不用重做）

| 能力 | 位置 | 说明 |
| --- | --- | --- |
| 字段内联报错 | `FormField` + `FormFields` | 传 `fieldErrors`；控件红色底线 + 下方「{字段名}不能为空」；**标签不变红** |
| 校验结果结构 | `lib/formValidation.js` | `emptyFieldMessage(label)`、`normalizeValidationResult(result)` |
| 表单状态 | `useDocumentForm` | 维护 `fieldErrors`；保存失败自动聚焦首错；字段变更后清除对应错误 |
| 页头状态标签 | `DocumentFormPage` | 新增页默认不展示；编辑页由 `getStatusBadges` 提供 |

### 页面只需提供

1. **校验函数**：返回 `null`（通过）、`{ fieldErrors: { supplier: '供应商不能为空' } }`（单头必填），或 `{ message: '第1行…' }`（明细/全局，走 Toast）。参考 `validateOrderForSave` / `validateOrderForSubmit`（`lib/purchaseOrderLogic.js`）。
2. **字段配置**：`formFields` 的 `key` 与 `fieldErrors` 的键一致。
3. **模块差异**：各模块自己的必填规则、明细行校验文案仍写在 `*Logic.js`，不宜再抽象成通用组件。

### 常用片段

```js
import { emptyFieldMessage } from '../lib/formValidation.js';

export function validateXxxForSave(form) {
  const fieldErrors = {};
  if (!form.supplier) fieldErrors.supplier = emptyFieldMessage('供应商');
  if (Object.keys(fieldErrors).length) return { fieldErrors };
  if (!form.lines?.length) return { message: '请至少添加一行有效商品明细' };
  return null;
}
```

文档侧：Demo PRD「操作与校验」引用[《UI布局公共说明》](../05-常用模板/02-模块设计交付/UI布局公共说明.md)「表单校验」行；模块只写与本页不同的校验项。

## 详情页标准接线

走 `DocumentDetailPage` 的单据详情页，优先**配置**已有分组与底部卡片，不要在页面里重复画胶囊 Tab、内嵌简表和操作日志。

### 分区顺序（自上而下）

1. `sections`：业务分组卡片（单据信息、收货与交期等），6 列 `DetailField` 栅格。
2. 商品明细：`lineSectionTitle` + `LineItemTable`（固定由框架渲染）。
3. `renderAfterLines`：插在明细之后、底部扩展区之前；**关联单据**等条件展示区块放这里（参考 `PurchaseOrderDetailPage.jsx`）。
4. `extraSections`：终止信息、**操作信息**等；`variant: 'meta-tabs'` 时走 `DocumentMetaTabsCard`。

### 已封装（页面不用重做）

| 能力 | 组件 / 常量 | 说明 |
| --- | --- | --- |
| 详情框架 | `DocumentDetailPage` | 配置 `sections`、`renderAfterLines`、`extraSections` |
| 胶囊 Tab 间距 | `detailTabSection.js` | `detailTabSectionClassName`（`px-4 pt-3 pb-3`）、`detailTabListClassName`（`px-0 pt-0`）、`detailTabPanelClassName`（`mt-3`，Tab 与内容 **12px**）、`detailTabFieldGridClassName`（6 列制单信息栅格） |
| 胶囊 Tab | `InnerTabs` `variant="pill"` | 高 `h-7`、圆角、选中浅主色底 + 主色描边；Tab 间距 `gap-2`；**不要**在详情卡片里用 `underline` 变体 |
| 操作信息 | `DocumentMetaTabsCard` | 默认标题「操作信息」；`制单信息` / `操作日志` 胶囊切换 |
| 制单字段 | `buildCreateMetaFields(row)` | 创建人、创建时间、最后更新人、最后更新时间 |
| 操作日志 | `OperationLogTable` + `lib/operationLog.js` | 列：操作时间、操作人、操作类型、说明；按时间倒序；空态 `min-h-[120px]` |
| 关联单据 | `RelatedDocumentsCard` | 多下游单据胶囊 Tab + 数量；简表可点单号跳转详情 |
| 详情内嵌简表 | `RelatedDocumentsCard` / `OperationLogTable` 共用样式 | 外框 `rounded border border-erp-border-table-row`；表头 `h-7` `bg-erp-surface-table-head`；数据行 `h-8` `bg-erp-surface-panel`；字号 12px |

### 页面只需提供

1. **业务分组**：`sections` 里各组的 `fields` 函数或数组；条件展示用 `visibleWhen`。
2. **关联单据**（按需）：`renderAfterLines` 返回 `RelatedDocumentsCard`；`sections` 配置列与行数据（或抽到 `*RelatedDocs.js`）；展示条件写在 `renderAfterLines` 或数据层（如仅已审核展示）。
3. **操作信息**：`extraSections` 增加 `{ title: '操作信息', variant: 'meta-tabs', tabs: [...] }`；日志用 `buildXxxOperationLogs(row)` 或在 tab 上挂 `logEntries`。
4. **行操作日志字段**：状态变更时在 `*Logic.js` 写入 `submittedAt`、`auditTime` 等时间戳，供 `operationLog.js` 推导。

### 常用片段

```js
// 操作信息（extraSections）
{
  title: '操作信息',
  variant: 'meta-tabs',
  defaultTab: 'create',
  tabs: ({ row }) => [
    { key: 'create', label: '制单信息', fields: buildCreateMetaFields(row) },
    { key: 'log', label: '操作日志', variant: 'log', logEntries: () => buildPurchaseOrderOperationLogs(row) },
  ],
}

// 关联单据（renderAfterLines）
renderAfterLines: ({ row, onOpenPage }) =>
  row.auditStatus === 'approved'
    ? <RelatedDocumentsCard sections={buildOrderRelatedDocumentSections(row)} onOpenPage={onOpenPage} />
    : null,
```

样板页：`PurchaseOrderDetailPage.jsx`（关联通知单/入库单 + 操作信息）、`PurchaseReceiptNoticeDetailPage.jsx`（关联入库单 + 操作信息）、`PurchaseInboundDetailPage.jsx`（操作信息）。

文档侧同步：[《UI布局公共说明》](../05-常用模板/02-模块设计交付/UI布局公共说明.md)、[页面骨架模板-V2](../05-常用模板/02-模块设计交付/页面骨架模板-V2.md)、详情 Demo PRD 模板。

### 暂不必再抽象

- 每个模块的 `visibleWhen` 与弹窗文案仍写在模块 `*Logic.js` / `*ActionDialogs.jsx`，不宜做成通用组件。
- 主数据列表的页内 Tab + 批量审核保留各页配置（参考 `WarehouseListPage.jsx`）。

## 新增单据页

1. 在 `src/data/` 加数据文件：列定义、状态字典、种子数据（参考 `orderData.js`、`inboundData.js`）。
2. 加三个配置页：列表／表单／详情（参考 `PurchaseOrder*` 三个页面；详情接法见「详情页标准接线」；单号生成用 `lib/documentNo.js`，校验用 `lib/validation.js`）。
3. 在 `src/config/pages.js` 注册页面，标 `navId`（侧边栏高亮用）。
4. 在 `src/config/nav.js` 的 `defaultNavItems` 加菜单（基线是《系统与模块地图》附录《系统菜单结构与期次》：名称、顺序都照那里排；未实现的页面会在 `config/pages.js` 自动挂占位页，不用逐个写空页面）。
5. 明细列与现有单据不同时，扩展 `LineItemTable` 的 variant；选项从 `masterData.js` 取。

## 导入导出与消息

- 导入导出对象统一注册在 `lib/transferTargets.js`（字段、必填、枚举、keyField、storageKey）；页面入口用 `TransferDropdown`／`ImportExportActions`，流程走 `ImportWizardDialog`／`ExportWizardDialog`，不要在页面里另写导入导出。
- 导入规则：按 `keyField` 匹配，已存在更新非空字段、不存在新增，导入后统一回 `auditStatus: draft` 等人工审核；新对象接入前先在 02/03 里把字段与校验规则定下来，`importable: false` 的对象列表页**不展示导入按钮**，仅保留导出。
- 所有导出都是异步任务，写入 `lib/taskStore.js`（`qs-erp:transfer-tasks:v1`），完成时推 `transfer` 类消息；导入导出中心两页共用 `TransferCenterPage`。
- 消息统一走 `lib/notificationStore.js` + `hooks/useNotifications.js`（分类：待办／业务／导入导出／系统），偏好走 `lib/preferences.js`；文件解析与生成统一用 `lib/spreadsheet.js`（xlsx 按需加载，csv/tsv 自解析）。

## 交付自检

- 跑 `npm run build` 和 `npm run test:sites`，都要通过；动过颜色就重新计算对比度。
- 在浏览器里把改动页面走一遍，确认无控制台报错。
