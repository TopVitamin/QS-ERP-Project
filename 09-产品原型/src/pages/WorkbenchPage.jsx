import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AnnouncementPanel, KnowledgePanel, LineTrendChart, PurchaseTargetCard, QuickLaunch, RealtimeOverview, TodoBoard, WarningPanel, WorkbenchCard } from '../components/erp/WorkbenchWidgets.jsx';
import { purchaseTrend, quickLaunches, realtimeMetrics, todoCategories, workbenchAnnouncements, workbenchKnowledge, workbenchWarnings } from '../data/workbenchData.js';

export function WorkbenchPage({ onFeedback, onOpenPage }) {
  const [todoCategory, setTodoCategory] = useState('采购');

  return (
    <main className="min-h-0 flex-1 overflow-y-auto bg-erp-surface">
      <div className="w-full p-2 xl:p-3">
        <header className="mb-2 flex h-8 items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-[20px] font-semibold tracking-tight text-erp-text-title">首页</h1>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-erp-text-muted">
            <span>数据更新于 15:30</span>
            <button type="button" className="inline-flex h-7 items-center gap-1.5 rounded-erp-control border border-erp-border-control bg-erp-surface-panel px-2.5 hover:border-erp-primary hover:text-erp-primary" onClick={() => onFeedback?.('数据已刷新')}>
              <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />刷新
            </button>
          </div>
        </header>

        <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1fr)_270px]">
          <div className="min-w-0 space-y-3">
            <QuickLaunch items={quickLaunches} onOpenPage={onOpenPage} onFeedback={onFeedback} />
            <TodoBoard categories={todoCategories} activeCategory={todoCategory} onCategoryChange={setTodoCategory} onOpenPage={onOpenPage} onFeedback={onFeedback} />
            <RealtimeOverview metrics={realtimeMetrics} />
            <div className="grid gap-3 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
              <PurchaseTargetCard />
              <WorkbenchCard title="采购趋势" extra={<span className="text-[11px] text-erp-text-muted">本月</span>}>
                <LineTrendChart data={purchaseTrend} />
              </WorkbenchCard>
            </div>
          </div>

          <aside className="space-y-3">
            <WarningPanel warnings={workbenchWarnings} onFeedback={onFeedback} />
            <AnnouncementPanel announcements={workbenchAnnouncements} onFeedback={onFeedback} />
            <KnowledgePanel links={workbenchKnowledge} onFeedback={onFeedback} />
          </aside>
        </div>
      </div>
    </main>
  );
}
