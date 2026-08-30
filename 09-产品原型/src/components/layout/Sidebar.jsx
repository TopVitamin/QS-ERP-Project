import { useState } from 'react';
import {
  BarChart3,
  ChevronLeft,
  FileCog,
  PackageOpen,
  ShoppingCart,
  Warehouse,
  Wrench,
} from 'lucide-react';
import { NavigationFlyout, getNavigationFlyoutLayout } from './NavigationFlyout.jsx';
import { purchaseGroups } from './PurchaseFlyout.jsx';

export const defaultNavItems = [
  { id: 'purchase', label: '采购管理', icon: ShoppingCart, groups: purchaseGroups },
  { id: 'sales', label: '销售管理', icon: BarChart3 },
  { id: 'inventory', label: '库存管理', icon: Warehouse },
  { id: 'settings', label: '系统设置', icon: FileCog },
  { id: 'base', label: '基础资料', icon: PackageOpen },
  { id: 'custom', label: '自定义中心', icon: Wrench },
];

export function Sidebar({ activeItem, activePageId, onSelect, items = defaultNavItems }) {
  const [collapsed, setCollapsed] = useState(false);
  const [openFlyout, setOpenFlyout] = useState(false);
  const [openGroups, setOpenGroups] = useState(items[0]?.groups ?? []);
  const [flyoutLayout, setFlyoutLayout] = useState({ top: 52, maxHeight: 400 });
  const sidebarWidth = collapsed ? 52 : 141;

  function showNavigationMenu(event, groups) {
    const layout = getNavigationFlyoutLayout(event.currentTarget.getBoundingClientRect());
    setFlyoutLayout(layout);
    setOpenGroups(groups);
    setOpenFlyout(true);
  }

  return (
    <aside
      className={`sidebar-shell relative z-40 flex h-screen shrink-0 flex-col overflow-visible border-r border-erp-sidebar-border text-erp-sidebar-text ${collapsed ? 'w-[52px]' : 'w-[141px]'}`}
      onMouseLeave={() => setOpenFlyout(false)}
    >
      <div className={`relative flex h-12 shrink-0 items-center overflow-hidden bg-erp-sidebar-brand ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
        <div className={`grid h-6 w-6 shrink-0 grid-cols-2 grid-rows-2 gap-1 ${collapsed ? '' : 'mr-2'}`}>
          <span className="rounded-full bg-[#0da5ef]" />
          <span className="rounded-full bg-[#2379e5]" />
          <span className="rounded-full bg-[#1fdbca]" />
          <span className="rounded-full bg-[#8e6ced]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="whitespace-nowrap text-[17px] font-semibold tracking-[0.5px] text-white">强盛ERP</div>
          </div>
        )}
      </div>

      <nav aria-label="主导航" className="no-scrollbar flex-1 overflow-y-auto overscroll-contain py-1">
        {items.map(({ id, label, icon: Icon, groups }) => {
          const hasSubmenu = Boolean(groups?.length);
          const isActive = activeItem === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={`group relative flex h-10 w-full items-center text-left text-[13px] ${collapsed ? 'justify-center' : 'px-2'}`}
              title={collapsed ? label : undefined}
              onMouseEnter={hasSubmenu ? (event) => showNavigationMenu(event, groups) : undefined}
              onFocus={hasSubmenu ? (event) => showNavigationMenu(event, groups) : undefined}
              onClick={() => {
                onSelect(id);
                if (hasSubmenu) setOpenFlyout(true);
              }}
            >
              <span
                className={`flex h-8 min-w-0 items-center rounded-erp-section ${collapsed ? 'w-8 justify-center' : 'flex-1 gap-2 px-3'} ${
                  isActive
                    ? 'bg-erp-sidebar-active-bg font-medium text-erp-primary'
                    : 'text-erp-sidebar-text hover:bg-erp-sidebar-hover-bg hover:text-erp-sidebar-active-text'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-erp-primary' : 'text-erp-sidebar-icon group-hover:text-erp-sidebar-active-text'}`} strokeWidth={1.8} />
                {!collapsed && <span className="truncate whitespace-nowrap">{label}</span>}
                {hasSubmenu && !collapsed && !isActive && <span className="ml-auto text-erp-sidebar-text/80">›</span>}
              </span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        aria-label={collapsed ? '展开菜单' : '收起菜单'}
        title={collapsed ? '展开菜单' : '收起菜单'}
        className={`flex h-8 shrink-0 items-center border-t border-erp-sidebar-border text-[12px] text-erp-sidebar-text hover:bg-erp-sidebar-hover-bg hover:text-white ${collapsed ? 'justify-center px-0' : 'gap-2 px-4'}`}
        onClick={() => {
          setCollapsed((value) => !value);
          setOpenFlyout(false);
        }}
      >
        <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} strokeWidth={1.6} />
        {!collapsed && <span>收起</span>}
      </button>

      {openFlyout && (
        <NavigationFlyout
          groups={openGroups}
          left={sidebarWidth}
          top={flyoutLayout.top}
          maxHeight={flyoutLayout.maxHeight}
          activePageId={activePageId}
          onSelect={(pageId) => {
            onSelect(pageId);
            setOpenFlyout(false);
          }}
        />
      )}
    </aside>
  );
}
