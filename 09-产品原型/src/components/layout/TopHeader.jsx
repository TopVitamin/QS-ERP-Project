import {
  Bell,
  Check,
  ChevronDown,
  CircleUserRound,
  Download,
  Home,
  LogOut,
  Search,
  Upload,
  UserRound,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu.jsx';
import { NotificationCenter } from './NotificationCenter.jsx';
import { PageTabs } from './PageTabs.jsx';
import { cn } from '../../lib/utils.js';
import { erpThemePresets } from '../../styles/tokens.js';

export function TopHeader({ tabs = [], activeView, onTabSelect, onTabClose, onTabAction, onAction, onOpenPage, theme = 'blue', onThemeChange }) {
  function showAction(message) {
    onAction?.(message);
  }

  return (
    <header className="top-header-surface flex h-12 shrink-0 items-stretch justify-between text-erp-text">
      <div className="flex min-w-0 flex-1 items-stretch">
        <button
          type="button"
          aria-label="首页"
          className={cn(
            'flex w-10 shrink-0 items-center justify-center border-r border-erp-border-strong',
            activeView === 'home' ? 'bg-erp-surface-panel' : 'hover:bg-erp-surface-panel/60',
          )}
          onClick={() => onTabSelect?.('home')}
        >
          <Home className="h-[18px] w-[18px]" strokeWidth={1.8} />
        </button>

        <PageTabs tabs={tabs} activeView={activeView} onTabSelect={onTabSelect} onTabClose={onTabClose} onTabAction={onTabAction} />
      </div>

      <div className="flex shrink-0 items-center gap-1.5 px-3 text-[12px]">
        <button type="button" aria-label="全局搜索" className="flex h-7 w-7 items-center justify-center rounded-erp-control bg-erp-text-muted text-white hover:bg-erp-text" onClick={() => showAction('已打开全局搜索')}><Search className="h-4 w-4" /></button>
        <div className="ml-0.5 flex items-center gap-1 border-l border-erp-border-strong pl-2 text-erp-text">
          <button
            type="button"
            aria-label="导入中心"
            title="导入中心"
            className="flex h-7 w-7 items-center justify-center rounded-erp-control border-0 bg-transparent text-erp-text hover:text-erp-primary"
            onClick={() => onOpenPage?.('import-center')}
          >
            <Upload className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            aria-label="导出中心"
            title="导出中心"
            className="flex h-7 w-7 items-center justify-center rounded-erp-control border-0 bg-transparent text-erp-text hover:text-erp-primary"
            onClick={() => onOpenPage?.('export-center')}
          >
            <Download className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <NotificationCenter onAction={showAction} onOpenPage={onOpenPage} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="个人中心" className="flex h-8 items-center gap-1.5 rounded-erp-control border-0 bg-transparent px-1 text-erp-text hover:text-erp-primary">
              <div className="flex h-8 w-8 items-center justify-center"><UserAvatar /></div>
              <span className="text-[12px]">个人中心</span>
              <ChevronDown className="h-3.5 w-3.5 text-erp-text-muted" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onSelect={() => onOpenPage?.('profile')}><UserRound className="h-4 w-4 text-erp-primary" strokeWidth={1.8} /><span>个人中心</span></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onOpenPage?.('notification-center')}><Bell className="h-4 w-4 text-erp-primary" strokeWidth={1.8} /><span>消息中心</span></DropdownMenuItem>
            <DropdownMenuSeparator />
            {erpThemePresets.map((preset) => (
              <DropdownMenuItem key={preset.id} onSelect={() => onThemeChange?.(preset.id)}>
                <span className="flex-1">{preset.label}主题</span>
                {theme === preset.id && <Check className="h-4 w-4 text-erp-primary" strokeWidth={2} />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-erp-text-muted data-[highlighted]:bg-erp-danger-bg data-[highlighted]:text-erp-danger" onSelect={() => showAction('退出登录')}><LogOut className="h-4 w-4" strokeWidth={1.8} /><span>退出登录</span></DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function UserAvatar() {
  return <CircleUserRound className="h-5 w-5" strokeWidth={1.7} />;
}
