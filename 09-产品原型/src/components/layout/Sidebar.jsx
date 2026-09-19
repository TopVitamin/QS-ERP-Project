import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { NavigationFlyout, getNavigationFlyoutLayout } from './NavigationFlyout.jsx';
import { isNavModuleAccessible, isPageImplemented } from '../../config/implementedPages.js';
import { resolvePageId } from '../../config/pages.js';
import { defaultNavItems } from '../../config/nav.js';
import { cn } from '../../lib/utils.js';

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
      <div className={`relative flex h-12 shrink-0 items-center overflow-hidden ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
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
        {items.map(({ id, label, icon: Icon, groups, tag }) => {
          const hasSubmenu = Boolean(groups?.length);
          const isActive = activeItem === id;
          const moduleAccessible = isNavModuleAccessible({ id, groups });
          return (
            <button
              key={id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              aria-label={label}
              className={`group relative flex h-[38px] w-full items-center text-left text-[12.5px] ${collapsed ? 'justify-center' : 'px-2'}`}
              title={collapsed ? label : undefined}
              onMouseEnter={hasSubmenu ? (event) => showNavigationMenu(event, groups) : undefined}
              onFocus={hasSubmenu ? (event) => showNavigationMenu(event, groups) : undefined}
              onClick={() => {
                if (hasSubmenu) {
                  setOpenGroups(groups);
                  setOpenFlyout(true);
                  const defaultPageId = resolvePageId(id);
                  if (isPageImplemented(defaultPageId)) {
                    onSelect(id);
                  }
                } else {
                  onSelect(id);
                  setOpenFlyout(false);
                }
              }}
            >
              <span
                className={cn(
                  'flex h-8 min-w-0 items-center rounded-erp-section',
                  collapsed ? 'w-8 justify-center' : 'flex-1 gap-2 px-3',
                  isActive
                    ? 'bg-erp-sidebar-active-solid font-medium text-white'
                    : moduleAccessible
                      ? 'text-erp-sidebar-text hover:bg-erp-sidebar-hover-bg hover:text-erp-sidebar-active-text'
                      : 'text-erp-sidebar-text/55 hover:bg-erp-sidebar-hover-bg/70 hover:text-erp-sidebar-text/70',
                )}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 shrink-0',
                    isActive
                      ? 'text-white'
                      : moduleAccessible
                        ? 'text-erp-sidebar-icon group-hover:text-erp-sidebar-active-text'
                        : 'text-erp-sidebar-icon/55 group-hover:text-erp-sidebar-text/70',
                  )}
                  strokeWidth={1.8}
                />
                {!collapsed && <span className="truncate whitespace-nowrap">{label}</span>}
                {!collapsed && tag && <span aria-label={tag} title={tag} className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />}
                {hasSubmenu && !collapsed && !isActive && !tag && <span className="ml-auto text-erp-sidebar-text/80">›</span>}
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
