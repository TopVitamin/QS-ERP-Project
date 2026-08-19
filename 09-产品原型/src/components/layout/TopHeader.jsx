import {
  Bell,
  Check,
  ChevronDown,
  CircleUserRound,
  Download,
  Home,
  LogOut,
  Search,
  Settings2,
  Upload,
  UserRound,
  X,
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu.jsx';
import { cn } from '../../lib/utils.js';
import { erpThemePresets } from '../../styles/tokens.js';

export function TopHeader({ tabs = [], activeView, onTabSelect, onTabClose, onAction, theme = 'blue', onThemeChange }) {
  function showAction(message) {
    onAction?.(message);
  }

  return (
    <header className="flex h-12 shrink-0 items-stretch justify-between bg-[linear-gradient(105deg,#edf1f6_0%,#f4f0f8_58%,#f0eaf5_100%)] text-erp-text">
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

        <div className="no-scrollbar flex min-w-0 flex-1 items-stretch overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  'group flex h-12 max-w-[168px] shrink-0 items-center gap-0 border-r border-erp-border-light px-2.5 text-[13px] transition-colors',
                  isActive
                    ? 'rounded-t-erp-section bg-erp-surface-panel text-erp-primary'
                    : 'bg-transparent text-erp-text-muted hover:bg-erp-surface-panel/60 hover:text-erp-text',
                )}
                onClick={() => onTabSelect?.(tab.id)}
              >
                <span className="min-w-0 truncate">{tab.title}</span>
                {tabs.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`关闭 ${tab.title}`}
                    className={cn(
                      'inline-flex max-w-0 shrink-0 overflow-hidden opacity-0 transition-all duration-150',
                      'group-hover:ml-1 group-hover:max-w-4 group-hover:opacity-100',
                      'group-focus-within:ml-1 group-focus-within:max-w-4 group-focus-within:opacity-100',
                      'rounded-erp-control p-0.5',
                      isActive ? 'text-erp-text-subtle hover:bg-erp-primary-soft hover:text-erp-primary' : 'text-erp-text-placeholder hover:bg-erp-surface-panel/70 hover:text-erp-text-muted',
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      onTabClose?.(tab.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        onTabClose?.(tab.id);
                      }
                    }}
                  >
                    <X className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 px-3 text-[12px]">
        <button type="button" aria-label="全局搜索" className="flex h-7 w-7 items-center justify-center rounded-erp-control bg-erp-text-muted text-white hover:bg-erp-text" onClick={() => showAction('已打开全局搜索')}><Search className="h-4 w-4" /></button>
        <div className="ml-0.5 flex items-center gap-1 border-l border-erp-border-strong pl-2 text-erp-text-muted">
          <button type="button" aria-label="导入" title="导入" className="flex h-7 items-center gap-1 rounded-erp-control border-0 bg-transparent px-1.5 hover:text-erp-primary" onClick={() => showAction('已点击导入')}>
            <Upload className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>导入</span>
          </button>
          <button type="button" aria-label="导出" title="导出" className="flex h-7 items-center gap-1 rounded-erp-control border-0 bg-transparent px-1.5 hover:text-erp-primary" onClick={() => showAction('已点击导出')}>
            <Download className="h-3.5 w-3.5" strokeWidth={1.8} />
            <span>导出</span>
          </button>
          <button type="button" aria-label="消息通知" title="消息通知" className="relative flex h-7 w-7 items-center justify-center rounded-erp-control border-0 bg-transparent text-erp-text-muted hover:text-erp-primary" onClick={() => showAction('已打开消息通知')}>
            <Bell className="h-4 w-4" strokeWidth={1.8} />
            <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-erp-danger" />
          </button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" aria-label="个人中心" className="flex h-8 items-center gap-1.5 rounded-erp-control border-0 bg-transparent px-1 text-erp-text-muted hover:text-erp-primary">
              <div className="flex h-8 w-8 items-center justify-center"><UserAvatar /></div>
              <span className="text-[12px]">个人中心</span>
              <ChevronDown className="h-3.5 w-3.5 text-erp-text-subtle" strokeWidth={2} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onSelect={() => showAction('已打开个人中心')}><UserRound className="h-4 w-4 text-erp-primary" strokeWidth={1.8} /><span>个人中心</span></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => showAction('已打开账号设置')}><Settings2 className="h-4 w-4 text-erp-primary" strokeWidth={1.8} /><span>账号设置</span></DropdownMenuItem>
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
