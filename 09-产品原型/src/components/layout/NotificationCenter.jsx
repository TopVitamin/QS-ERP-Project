import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover.jsx';
import { NotificationTag } from '../erp/NotificationTag.jsx';
import { cn } from '../../lib/utils.js';
import { useNotifications } from '../../hooks/useNotifications.js';
import { markAllNotificationsRead, markNotificationRead } from '../../lib/notificationStore.js';

export function NotificationCenter({ onAction, onOpenPage }) {
  const items = useNotifications();
  const [open, setOpen] = useState(false);
  const unreadCount = items.filter((item) => !item.read).length;
  const recentItems = items.slice(0, 6);

  function openItem(item) {
    markNotificationRead(item.id);
    setOpen(false);
    if (item.link?.pageId) onOpenPage?.(item.link.pageId);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={unreadCount ? `消息通知（${unreadCount} 条未读）` : '消息通知'}
          title="消息通知"
          className="relative flex h-7 w-7 items-center justify-center rounded-erp-control border-0 bg-transparent text-erp-text hover:text-erp-primary"
        >
          <Bell className="h-4 w-4" strokeWidth={1.8} />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-erp-danger px-0.5 text-[9px] font-medium leading-none text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[320px] p-0">
        <div className="flex h-10 items-center justify-between border-b border-erp-border-header px-3">
          <span className="text-[13px] font-medium text-erp-text-title">消息通知</span>
          <button
            type="button"
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1 text-[12px] text-erp-primary hover:text-erp-primary-hover disabled:text-erp-text-disabled"
            onClick={() => {
              markAllNotificationsRead();
              onAction?.('消息已全部标记为已读');
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.9} />
            全部已读
          </button>
        </div>
        <div className="max-h-[280px] overflow-y-auto">
          {recentItems.length === 0 && <div className="flex h-24 items-center justify-center text-[12px] text-erp-text-muted">暂无消息</div>}
          {recentItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full items-start gap-2 border-b border-erp-border-light px-3 py-2.5 text-left last:border-b-0 hover:bg-erp-surface-hover"
              onClick={() => openItem(item)}
            >
              <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', item.read ? 'bg-transparent' : 'bg-erp-primary')} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] text-erp-text">{item.title}</span>
                <span className="mt-1 flex items-center gap-2 text-[11px] text-erp-text-muted">
                  <NotificationTag tag={item.tag} />
                  <span>{item.time}</span>
                </span>
              </span>
            </button>
          ))}
        </div>
        <div className="border-t border-erp-border-header p-1">
          <button
            type="button"
            className="flex h-8 w-full items-center justify-center rounded-erp-control text-[12px] text-erp-primary hover:bg-erp-primary-soft"
            onClick={() => {
              setOpen(false);
              onOpenPage?.('notification-center');
            }}
          >
            查看全部
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
