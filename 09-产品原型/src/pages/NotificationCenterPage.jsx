import { useMemo, useState } from 'react';
import { BellOff, Check, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { InnerTabs } from '../components/erp/InnerTabs.jsx';
import { NotificationTag } from '../components/erp/NotificationTag.jsx';
import { PaginationBar } from '../components/erp/PaginationBar.jsx';
import { notificationCategories } from '../data/notificationData.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { clearReadNotifications, markAllNotificationsRead, markNotificationRead, removeNotification } from '../lib/notificationStore.js';
import { cn } from '../lib/utils.js';
import { typography } from '../styles/typography.js';

const defaultPageSize = 20;

export function NotificationCenterPage({ onFeedback, onOpenPage }) {
  const items = useNotifications();
  const [tab, setTab] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const unreadCount = items.filter((item) => !item.read).length;
  const readCount = items.length - unreadCount;

  const filteredItems = useMemo(() => {
    if (tab === 'unread') return items.filter((item) => !item.read);
    if (tab) return items.filter((item) => item.category === tab);
    return items;
  }, [items, tab]);

  const pageCount = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabs = [
    { value: '', label: '全部', count: items.length },
    { value: 'unread', label: '未读', count: unreadCount },
    ...notificationCategories.map((category) => ({
      ...category,
      count: items.filter((item) => item.category === category.value).length,
    })),
  ];

  function openItem(item) {
    markNotificationRead(item.id);
    if (item.link?.pageId) onOpenPage?.(item.link.pageId);
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-erp-border-header bg-erp-surface-panel px-4">
        <h1 className={cn(typography.pageTitle)}>消息中心</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={unreadCount === 0}
            onClick={() => {
              markAllNotificationsRead();
              onFeedback?.('消息已全部标记为已读', 'success');
            }}
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={1.9} />全部已读
          </Button>
          <Button
            variant="outline"
            disabled={readCount === 0}
            onClick={() => {
              clearReadNotifications();
              onFeedback?.('已清空已读消息', 'success');
            }}
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.9} />清空已读
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col bg-erp-surface px-4 pt-3">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-erp-section bg-erp-surface-panel">
          <InnerTabs items={tabs} value={tab} onChange={(value) => { setTab(value); setPage(1); }} />

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {pageItems.length === 0 && (
              <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-erp-text-muted">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-erp-surface-muted">
                  <BellOff className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <span className="text-[12px]">暂无消息</span>
              </div>
            )}
            <div className="space-y-1">
              {pageItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'group flex h-8 cursor-pointer items-center gap-2 rounded-erp-section border px-2 text-[12px] transition-colors',
                  item.read
                    ? 'border-erp-border-light bg-erp-surface-panel hover:bg-erp-surface-hover'
                    : 'border-erp-primary/25 bg-erp-primary-soft/50 hover:bg-erp-primary-soft',
                )}
                role="button"
                tabIndex={0}
                onClick={() => openItem(item)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openItem(item);
                  }
                }}
              >
                <span className="flex w-1.5 shrink-0 justify-center">
                  <span className={cn('h-1.5 w-1.5 rounded-full', item.read ? 'bg-transparent' : 'bg-erp-primary')} aria-hidden="true" />
                </span>
                <NotificationTag tag={item.tag} className="shrink-0" />
                <span className={cn('min-w-0 flex-1 truncate', item.read ? 'text-erp-text' : 'font-medium text-erp-text-title')} title={item.title}>
                  {item.title}
                </span>
                <span className="w-[118px] shrink-0 text-right text-[11px] text-erp-text-muted">{item.time}</span>
                <span className="flex w-[52px] shrink-0 items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                  {!item.read && (
                    <button
                      type="button"
                      title="标记已读"
                      aria-label="标记已读"
                      className="flex h-6 w-6 items-center justify-center rounded-erp-control text-erp-text-muted hover:bg-erp-primary-soft hover:text-erp-primary"
                      onClick={(event) => {
                        event.stopPropagation();
                        markNotificationRead(item.id);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={1.9} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="删除"
                    aria-label="删除消息"
                    className="flex h-6 w-6 items-center justify-center rounded-erp-control text-erp-text-muted hover:bg-erp-danger-bg hover:text-erp-danger"
                    onClick={(event) => {
                      event.stopPropagation();
                      removeNotification(item.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.8} />
                  </button>
                </span>
              </div>
              ))}
            </div>
          </div>

          <div className="shrink-0 border-t border-erp-border-header">
            <PaginationBar
              total={filteredItems.length}
              selectedCount={0}
              currentPage={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
