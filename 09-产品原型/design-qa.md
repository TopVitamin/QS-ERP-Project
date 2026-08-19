# Design QA

## Source visual truth

- Screenshot: `/var/folders/m9/w1mblz191ts01m49_kjrtn100000gp/T/codex-clipboard-26e8a77e-6f90-4cee-8b00-f1fbdbb0f6d8.png`
- Live source URL: `https://tf.jdy.com/ierp/index.html?formId=home_page`
- Reference state: purchase order list, default pending-review view, submenu closed.

## Implementation evidence

- Local URL: `http://localhost:4173/`
- Screenshot: `/tmp/codex-kd-order-table-row-actions-floating-final.jpg`
- Browser viewport: `2048 × 1008 CSS px`, `devicePixelRatio = 2`; Browser screenshot output is `2048 × 1008`.
- Source attachment raster size: `4098 × 2130`; it was treated as a high-density visual reference. Layout comparison used the live source geometry read at the same `2048 × 1008` CSS viewport rather than comparing raw pixels with different raster dimensions.

## Full-view comparison evidence

The implementation preserves the source's primary geometry: a `141px` sidebar, `48px` top header, a white `48px` page header with global actions, a multi-row purchase filter panel, a `40px` filter control row, `12px` content inset, `32px` table header, `40px` table rows, and a `48px` pagination footer. The main table retains the source's wide fixed columns, sticky operation column, and horizontal scroll behavior.

## Focused region comparison evidence

- Navigation: the left rail is reduced to `采购管理`、`销售管理`、`库存管理`、`系统设置`、`基础资料`、`自定义中心`; the brand reads `强盛ERP`, and the collapse affordance remains.
- Header and filters: gradient status bar, active list tab, white title card area, purchase-order page actions, a three-part filter structure, and right-side global search, import, export, notifications, and personal center are present. The page actions are ordered as `新增` → `导入` → `导出`; page-level import/export are plain buttons without dropdown arrows. The filter criteria use purchase-order semantics: document date, purchase mode, supplier, settlement supplier, document number/supplier keyword, and audit status. The six core criteria are arranged as six equal columns, with each label above its full-width input/select and a fixed label line height for mixed-language alignment. The criteria panel contains one checkbox row below the six fields; the query-mode radio row is removed.
- Title and controls: the page title is slightly lowered within the white title row with a deeper navy color; icon-and-text buttons use tighter gaps and reduced horizontal padding.
- Header tool styling: the right side is reduced to search, a divider, import, export, notifications, and personal center; the persistent AI assistant and date text are removed. These triggers use transparent backgrounds, zero borders, and line icons; only the expanded personal menu uses a white surface.
- Table: fixed-width columns, clean text-only header labels, blue order links, semantic status colors, light grid borders, selection checkboxes, and a fixed right-side `操作` column with a stronger left boundary, floating shadow, left-aligned row actions, horizontal scroll indicator, and real pagination are present.
- Purchase submenu: the supplied open-menu screenshot state is implemented as a hover/click state with three columns and the same dark panel treatment.

## Interaction and console checks

- Search `CGDD-20260818-00045` → 2 matching purchase orders after clicking `查询`.
- Select one result row → `已选中1条`.
- Click a row's `入库` action → row-specific feedback `CGDD-20260818-00048：已入库`.
- Click `采购管理` → purchase flyout becomes visible.
- Default purchase-order state after reload → 26 rows rendered, no selected rows; page size is 20 and the footer reports 2 pages.
- Targeted visual checks → sidebar uses the sampled dark-indigo-to-gray-purple vertical gradient; the `采购订单列表` title parent has a white background; header arrow glyph count is `0`.
- Content reduction checks → sidebar has exactly 6 modules; the removed top-right labels and legacy `金蝶AI星辰`/`专业版` branding are absent.
- Global tools checks → `导入`、`导出`、`消息通知` and `个人中心` are visible; the personal menu exposes `个人中心`、`账号设置` and `退出登录`.
- Global notification interaction → click `消息通知` shows `已打开消息通知`.
- Personal center interaction → click `个人中心` opens the menu and sets `aria-expanded="true"`.
- Filter action interaction → in the expanded state, `收起过滤` is at the left of the filter control row and `重置`/`查询` are visible on the right; after collapsing, the entire filter control row—including `重置` and `查询`—is hidden, while `展开过滤` moves beside `采购订单列表`; clicking it restores the criteria panel. `更多`、`筛选设置` and `查询模式` are absent from the filter panel.
- Header tool styling checks → import/export/notification/profile computed background is transparent and border width is `0px`.
- Header order checks → buttons appear as `全局搜索` → divider → `导入` → `导出` → `消息通知` → `个人中心`; `AI助手` and `2025年 02 期` are absent.
- Page identity → title `强盛ERP - 采购订单列表`, URL `http://localhost:4173/`.
- Purchase-inbound page → selecting `采购管理` → `采购入库` renders `采购入库单列表`, with its own filters, columns, status labels, and row actions.
- Mature interaction primitives → profile menu and column settings use dropdown menus; selection and `整单` use checkbox/switch primitives; filter fields can use `DatePicker` (Popover + React Day Picker), searchable single-select `Combobox`, searchable `MultiSelect`, clearable single-line input, and Radix `RadioGroup`; destructive actions use confirmation dialogs; toast feedback uses Sonner.
- Console health → no warning or error logs reported by the Browser capture; only Vite/React informational messages were present.

## Findings

No actionable P0/P1/P2 findings remain.

Residual P3 differences are intentional or scope-limited: proprietary Kingdee logo/avatar artwork and the right-side floating assistant rail are approximated/omitted because the request prioritizes the page framework and explicitly allows the floating side content to be ignored.

## Comparison history

1. Initial implementation matched the major frame but placed the total strip at the bottom of the scroll viewport, allowing a body row to show through the scrollbar gap. Fixed by anchoring the total strip `11px` above the bottom and adding a visual horizontal-scroll track.
2. Initial header included an extra `采购订单` tab not present in the supplied screenshot. Removed it so `采购订单列表` follows the home entry directly.
3. Re-captured the default state and re-ran search, row selection, submenu, build, Sites packaging tests, and console checks.
4. Follow-up visual fixes: sampled the reference left rail and replaced the flat sidebar color with the matching vertical gradient, placed the page title row on the white content card, gave the active top tab an explicit rounded white-card boundary, and removed the table header arrow glyphs that do not represent the source hover-search behavior.
5. Product naming and scope reduction: reduced the left navigation to six requested modules, renamed the brand to `强盛ERP`, and removed the unused satisfaction, co-creation, help, and industry-version controls from the top-right header.
6. Global workspace tools: added import, export, notification, and personal-center entry points; the personal-center menu contains account and logout actions, while the current implementation reports placeholder actions through the existing Toast feedback.
7. Spacing refinement: lowered and darkened the page title, then tightened icon/text gaps and horizontal padding for the filter, create, import/export, refresh, and table action buttons.
8. Header tool refinement: removed the white fills and borders from import, export, notification, and personal-center triggers, and changed the personal-center trigger to a transparent line-icon treatment while keeping its dropdown surface.
9. Final top-right reduction: removed the remaining AI assistant and date text, then placed the divider immediately after search so the right-side sequence is search, import, export, notification, and personal center.
10. Purchase-order query redesign: replaced the compact legacy search row with a three-part purchase-order filter panel—page header and global actions, horizontal purchase criteria and visibility options, and filter controls—while keeping the existing order table and its row actions.
11. Filter alignment refinement: changed the six core purchase-order conditions to a six-column grid with vertical labels and controls; controls now share each column's width and stay aligned when labels vary in length or language.
12. Purchase filter controls refinement: removed the unused `常用视图`、`更多` and `筛选设置`, ordered page actions as `新增`、`导入`、`导出`, removed import/export dropdown arrows, and moved `展开过滤` beside the title when the panel is collapsed.
13. Filter collapse cleanup: hid the complete filter control row when collapsed so `重置` and `查询` do not remain without their filter fields; removed the query-mode row and tightened label/control spacing.
14. Table operation simplification: reduced the batch toolbar to `审核`、`删除`、`打印`、`更新`, removed the low-priority tracking/batch/attachment/merge actions, and added a sticky right-side `操作` column for `启用`、`关闭`、`入库` row actions.
15. Operation column visual refinement: strengthened the sticky column's left border and shadow to make it read as a floating layer above the horizontally scrolling table; aligned all row actions left and normalized them to blue clickable text.

## Implementation checklist

- [x] React + Tailwind CSS app in the requested `Codex+KD` folder.
- [x] Componentized sidebar, top header, page filters, action toolbar, table, flyout menu, and pagination.
- [x] Default visual state compared against the supplied screenshot.
- [x] Search, selection, real pagination controls, and purchase submenu respond.
- [x] Purchase-order query panel supports keyword filtering, reset, collapse/expand, and query feedback.
- [x] Six core purchase-order conditions render in one row with aligned label/control stacks.
- [x] Collapsed filters hide the reset/query controls; expanded filters show only the checkbox row beneath the six core fields.
- [x] Batch toolbar and row actions are separated; the row operation column stays fixed on the right while the wide table scrolls horizontally.
- [x] Purchase-inbound list reuses the shared list page frame and supports filtering, selection, confirmation, column visibility, row status updates, and pagination.
- [x] Shared UI primitives are centralized under `src/components/ui/`, and ERP list patterns are centralized under `src/components/erp/`.
- [x] `npm run build` passed.
- [x] `npm run test:sites` passed.

final result: passed
