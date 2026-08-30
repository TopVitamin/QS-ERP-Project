# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

控件样式：查询区、单据基本信息等业务字段默认采用仅保留下边框的底线样式；商品明细表格中的可编辑输入框和下拉框采用完整边框；分页页码和分页条数选择器保留完整边框。禁用控件不使用灰色背景，改用浅色文字和浅色边框表达不可编辑状态。

明细汇总：合计行使用紧凑高度，汇总值落在对应业务列下方；金额汇总使用普通表格字号并适度加粗。数字输入框隐藏浏览器原生上下步进器，避免右对齐数字出现多余空白。

基础信息栅格：普通字段默认占 1 列，关联单据不独占整行；备注等辅助说明字段占 3 列，并使用与普通输入框一致的单行高度。

Mock 数据：不接后端，单据保存和列表操作写入浏览器 `localStorage`，刷新页面后继续保留；不同单据之间的关联选项从本地 Mock 集合读取。
