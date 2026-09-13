# 产品原型 · 开工须知

适用范围：`09-产品原型/`（React + Vite + Tailwind 演示原型，不接后端）。需求、字段与业务规则看 01–03，这里不重复。

## 工作方式

- 能自己起服务就自己起：`npm run dev` 后在浏览器里自检，不要把启动命令丢给用户。
- 视觉以参考截图或线上原型为准：布局、密度、间距、颜色、字体、可见内容与层级都按它来。
- 只把跨页面、可复用的规则写进本文件；一次性决定留在对应页面或数据文件，不写成长日志。
- UI 写在 `src/`；保持 `.openai/hosting.json`、`worker/index.js`、`scripts/prepare-sites-build.mjs`、`tests/sites-worker.test.mjs` 不动。

## 前端规范

- 字体与对比度：正文和控件保持 12px 紧凑型（compact），不放大字号解决对比度。可读文本统一用深墨蓝 `text-erp-text`（正文、表头、表单标签、批量操作按钮、首页卡片正文），灰色（`text-erp-text-muted`）只用于分页计数、占位、禁用等次要信息；语义色文字已加暗到 ≥4.5:1，亮色只用于填充、边框、圆点和图表，新增颜色按实际背景实测。禁用态文字用 `text-erp-disabled`，不复用 `text-erp-text-muted`。
- 主题：`data-theme` 挂 `documentElement`，弹层／下拉／弹窗／Toast 才能跟随主题；顶栏用 `--erp-header-gradient` 渐变（随主题微调）；左侧菜单固定近黑中性色（`--erp-sidebar-solid: #1f232e`，hover／边框／弹出层从它混出，不随主题换底），只有选中项 `--erp-sidebar-active-solid` 跟主题主色（配白字）；主按钮用主题主色（默认精工蓝，不用金蝶的绿色）；主题清单在 `styles/tokens.js`，新增主题在 `styles.css` 补 brand／hover／selected／active-solid／表头渐变并实测对比度（文字 ≥4.5:1、选中块与侧栏底 ≥2:1、hover 与底 ≥1.4:1）；图表等装饰色走 `rgb(var(--erp-brand-500))`，不硬编码。
- 控件样式：业务字段用仅保留底边框的底线样式；明细表格内输入框和下拉用完整边框；分页页码与条数选择器保留完整边框；禁用控件不用灰背景。
- 明细与栅格：合计行紧凑、汇总值落在对应列下、金额适度加粗；基础信息普通字段占 1 列、备注占 3 列且单行高度；数字输入框隐藏原生步进器。
- 查询区：搜索字段是纯输入框（`FilterControl` 已统一），不加放大镜等图标，页面配置不传 `trailingIcon`；有值后 hover 出现清除按钮。
- 下拉弹层：宽度按内容自适应（`SelectContent` 已统一）——最窄对齐触发器、最宽 560px 且不出屏、选项单行；不要写死成触发器宽度。
- 列表交互：重置只还原筛选和选中，不改列显隐；页码可清空编辑，失焦或越界回合法页；操作列宽按 `rowActions` 数量计算；列表默认不限日期，保证新单保存后可见。状态页内 Tab（`InnerTabs`）只用于审核状态这类主流程页面（如仓库档案），位置在表格卡片顶部、批量操作栏之上；用了 Tab 就不再在筛选区重复放同一状态字段。
- 排序：只给日期、金额、数量这类可比较的列开排序，文本列（单号、供应商等）不排序；排序图标同族，未排序显示上下两个箭头，升／降序显示单个箭头（`DataTable` 已统一）。
- 列设置：面板支持搜索列名、勾选显隐、拖动排序、图钉固定左侧、恢复默认（`ColumnSettings` 已统一）；固定列吸附在勾选列之后，右侧操作列保持固定；列宽拖拽和右键自适应留在表头。
- 配色基线（对齐金蝶 tf.jdy.com 实测）：画布 `#EBEDF1`、表头 `#F6F6FB`、数据行 `#FFFFFF`（不做斑马纹）、行线 `#D2D0E4`、列线 `#E8E9EB`；可读文字（含 Tab 未选中）`#07073F`，次级灰 `#66667F`（顶栏浅色渐变上按最深处实测 ≥4.5:1），输入占位 `#555871`，禁用 `#787A94`。语义色色相向金蝶靠（橙 `#B85700`、绿 `#2A8003`、红 `#D42626`），但必须保持 ≥4.5:1。
- 列表框架尺寸：页面标题行 48px；表格卡片内 Tab 行 40px、批量操作行 48px、分页行 48px（`InnerTabs`／`BulkActionBar`／`PaginationBar` 已统一）。Tab（`px-3`）选中态只用加粗文字 + 2px 下划线，不加背景色；下划线要压在 Tab 行底线上：底线用容器的 inset box-shadow（`shadow-[inset_0_-1px_0_rgb(var(--erp-border-default))]`）画并给容器留 `pb-px`，让按钮不占满底线、hover 背景盖不到线，指示线用 `-bottom-px` 探出按钮盖住底线；Tab 行用 `px-1 gap-3`，首项文字与下方批量操作栏的「已选中」左对齐。批量操作用纯文字按钮（12px、常规字重、无图标、不加边框，默认次级文字色、悬停出浅底，危险操作用红色文字），按钮之间用 12px 高的 `bg-erp-border-light` 浅色竖线分隔（`已选中 X 条` 之后也要有分隔线）；行内操作保持文字链接。注意 erp 颜色里默认边框的类名是 `border-erp-border`，没有 `border-default` 后缀。
- 表单：所有输入都要有可访问名称（`FormControl` 管基础信息、`LineItemTable` 管明细）；拒绝负数单价（`lib/validation.js` 的 `hasNegativePrice`）；字段默认值不得与列表默认筛选冲突。
- 主数据：供应商、仓库、员工、部门、SKU 等选项只从 `src/data/masterData.js` 取，页面和筛选不另建。
- Mock 数据：写入 `localStorage`，刷新保留；单据间的关联选项从本地 Mock 集合读取。

## 新增单据页

1. 在 `src/data/` 加数据文件：列定义、状态字典、种子数据（参考 `orderData.js`、`inboundData.js`）。
2. 加三个配置页：列表／表单／详情（参考 `PurchaseOrder*` 三个页面；单号生成用 `lib/documentNo.js`，校验用 `lib/validation.js`）。
3. 在 `src/config/pages.js` 注册页面，标 `navId`（侧边栏高亮用）。
4. 在 `Sidebar.jsx` 的 `defaultNavItems` 加导航分组（参考 `purchaseGroups`）。
5. 明细列与现有单据不同时，扩展 `LineItemTable` 的 variant；选项从 `masterData.js` 取。

## 导入导出与消息

- 导入导出对象统一注册在 `lib/transferTargets.js`（字段、必填、枚举、keyField、storageKey）；页面入口用 `TransferDropdown`／`ImportExportActions`，流程走 `ImportWizardDialog`／`ExportWizardDialog`，不要在页面里另写导入导出。
- 导入规则：按 `keyField` 匹配，已存在更新非空字段、不存在新增，导入后统一回 `auditStatus: draft` 等人工审核；新对象接入前先在 02/03 里把字段与校验规则定下来，`importable: false` 的对象只提示「待确认」。
- 所有导出都是异步任务，写入 `lib/taskStore.js`（`qs-erp:transfer-tasks:v1`），完成时推 `transfer` 类消息；导入导出中心两页共用 `TransferCenterPage`。
- 消息统一走 `lib/notificationStore.js` + `hooks/useNotifications.js`（分类：待办／业务／导入导出／系统），偏好走 `lib/preferences.js`；文件解析与生成统一用 `lib/spreadsheet.js`（xlsx 按需加载，csv/tsv 自解析）。

## 交付自检

- 跑 `npm run build` 和 `npm run test:sites`，都要通过；动过颜色就重新计算对比度。
- 在浏览器里把改动页面走一遍，确认无控制台报错。
