import { useState } from 'react';
import { CircleUserRound, MessageSquare } from 'lucide-react';
import { Button } from '../components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select.jsx';
import { Switch } from '../components/ui/switch.jsx';
import { currentAccount, themeSwatchColors } from '../data/accountData.js';
import { useNotifications } from '../hooks/useNotifications.js';
import { readPreferences, writePreferences } from '../lib/preferences.js';
import { erpThemePresets } from '../styles/tokens.js';
import { PAGE_REGISTRY } from '../config/pages.js';
import { isPageImplemented } from '../config/implementedPages.js';
import { cn } from '../lib/utils.js';
import { typography } from '../styles/typography.js';

function getHomeOptions() {
  return [
    { value: 'home', label: '首页' },
    ...['purchase-order', 'purchase-inbound']
      .filter((pageId) => isPageImplemented(pageId))
      .map((pageId) => ({ value: pageId, label: PAGE_REGISTRY[pageId]?.title || pageId })),
  ];
}

export function ProfilePage({ theme, onThemeChange, onFeedback, onOpenPage }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const notifications = useNotifications();
  const unreadCount = notifications.filter((item) => !item.read).length;
  const homeOptions = getHomeOptions();

  function updatePreference(patch) {
    setPreferences((current) => ({ ...current, ...patch }));
    writePreferences(patch);
    if (patch.theme) onThemeChange?.(patch.theme);
    onFeedback?.('偏好设置已保存', 'success');
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <header className="flex h-12 shrink-0 items-center border-b border-erp-border-header bg-erp-surface-panel px-4">
        <h1 className={cn(typography.pageTitle)}>个人中心</h1>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 xl:p-4">
        <div className="grid items-start gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
          <section className="rounded-erp-section bg-erp-surface-panel p-4" aria-label="账号信息">
            <div className="flex items-center gap-3 border-b border-erp-border-light pb-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-erp-primary-soft text-erp-primary">
                <CircleUserRound className="h-7 w-7" strokeWidth={1.6} />
              </span>
              <div className="min-w-0">
                <div className="text-[15px] font-medium text-erp-text-title">{currentAccount.name}</div>
                <div className="mt-0.5 inline-flex rounded-erp-status bg-erp-primary-soft px-1.5 py-0.5 text-[11px] text-erp-primary">{currentAccount.role}</div>
              </div>
            </div>
            <dl className="mt-3 space-y-2.5 text-[12px]">
              <InfoRow label="所属部门" value={currentAccount.department} />
              <InfoRow label="手机号" value={currentAccount.phone} />
              <InfoRow label="邮箱" value={currentAccount.email} />
              <InfoRow label="入职时间" value={currentAccount.joinedAt} />
            </dl>
          </section>

          <div className="space-y-3">
            <section className="rounded-erp-section bg-erp-surface-panel p-4" aria-label="偏好设置">
              <h2 className="border-b border-erp-border-light pb-3 text-[13px] font-medium text-erp-text-title">偏好设置</h2>

              <div className="mt-3 space-y-3.5">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-[12px] text-erp-text">界面主题</div>
                    <div className="mt-0.5 text-[11px] text-erp-text-muted">切换后立即生效，并同步顶栏主题菜单</div>
                  </div>
                  <div className="flex max-w-[720px] flex-wrap items-center justify-end gap-2">
                    {erpThemePresets.map((preset) => {
                      const active = theme === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          aria-label={`${preset.label}主题`}
                          aria-pressed={active}
                          className={cn(
                            'flex h-7 items-center gap-1.5 rounded-erp-control border px-2 text-[12px] transition-colors',
                            active ? 'border-erp-primary bg-erp-primary-soft text-erp-primary' : 'border-erp-border-control text-erp-text hover:border-erp-primary',
                          )}
                          onClick={() => updatePreference({ theme: preset.id })}
                        >
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: themeSwatchColors[preset.id] }} />
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-[12px] text-erp-text">消息提醒</div>
                    <div className="mt-0.5 text-[11px] text-erp-text-muted">关闭后，导入导出完成等消息不再进入消息中心</div>
                  </div>
                  <Switch
                    checked={preferences.messageEnabled !== false}
                    aria-label="消息提醒"
                    onCheckedChange={(checked) => updatePreference({ messageEnabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-[12px] text-erp-text">默认首页</div>
                    <div className="mt-0.5 text-[11px] text-erp-text-muted">下次打开系统时生效</div>
                  </div>
                  <Select value={preferences.defaultHome} onValueChange={(value) => updatePreference({ defaultHome: value })}>
                    <SelectTrigger variant="boxed" className="w-44" aria-label="默认首页"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {homeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            <section className="rounded-erp-section bg-erp-surface-panel p-4" aria-label="我的消息">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-erp-surface-muted text-erp-text-muted">
                    <MessageSquare className="h-4 w-4" strokeWidth={1.8} />
                  </span>
                  <div>
                    <div className="text-[12px] text-erp-text">我的消息</div>
                    <div className="mt-0.5 text-[11px] text-erp-text-muted">
                      {unreadCount > 0 ? `${unreadCount} 条未读消息待查看` : '暂无未读消息'}
                    </div>
                  </div>
                </div>
                <Button variant="outline" onClick={() => onOpenPage?.('notification-center')}>打开消息中心</Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-erp-text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-erp-text" title={String(value)}>{value}</dd>
    </div>
  );
}
