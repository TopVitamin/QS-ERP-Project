import { ArrowRight, ClipboardCheck, ClipboardList, PackagePlus, ShoppingCart, TriangleAlert, Warehouse } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const launchIcons = { order: ShoppingCart, inbound: PackagePlus, list: ClipboardList, warehouse: Warehouse, review: ClipboardCheck, warning: TriangleAlert };
const launchTones = {
  blue: 'bg-[#5a7ff0]',
  cyan: 'bg-[#45c4c7]',
  violet: 'bg-[#7668e9]',
  orange: 'bg-[#f29a45]',
  pink: 'bg-[#ec6a9b]',
  green: 'bg-[#56b98a]',
};
const todoTones = {
  primary: 'bg-erp-primary-soft text-erp-primary',
  success: 'bg-erp-success-bg text-erp-success',
  warning: 'bg-erp-warning-bg text-erp-warning',
  danger: 'bg-erp-danger-bg text-erp-danger',
};
const warningTones = {
  primary: 'text-erp-primary',
  warning: 'text-erp-warning',
  danger: 'text-erp-danger',
};

export function WorkbenchCard({ title, extra, children, className }) {
  return (
    <section className={cn('relative overflow-hidden rounded-erp-section border border-erp-border-light bg-[linear-gradient(135deg,#ffffff_0%,#fbfcff_100%)] shadow-[0_1px_4px_rgb(30_35_80_/_0.06)]', className)}>
      {(title || extra) && (
        <div className="flex h-11 items-center justify-between border-b border-erp-border-light px-4">
          <h2 className="text-[13px] font-semibold text-erp-text-section">{title}</h2>
          {extra}
        </div>
      )}
      {children}
    </section>
  );
}

export function QuickLaunch({ items = [], onOpenPage, onFeedback }) {
  return (
    <WorkbenchCard title="快捷发起">
      <div className="grid grid-cols-3 gap-3 px-4 py-4 xl:grid-cols-6">
        {items.map((item) => {
          const Icon = launchIcons[item.icon] ?? ShoppingCart;
          return (
            <button key={item.label} type="button" className="group flex min-w-0 flex-col items-center gap-2 rounded-erp-control px-2 py-1.5 hover:bg-erp-surface-soft" onClick={() => item.pageId ? onOpenPage?.(item.pageId) : onFeedback?.(item.action)}>
              <span className={cn('flex h-9 w-9 items-center justify-center rounded-erp-control text-white shadow-sm transition-transform group-hover:-translate-y-0.5', launchTones[item.tone] ?? launchTones.blue)}>
                <Icon className="h-4 w-4" strokeWidth={1.8} />
              </span>
              <span className="max-w-full truncate text-[12px] font-medium text-erp-text-section">{item.label}</span>
              <span className="max-w-full truncate text-[10px] text-erp-text-muted">{item.description}</span>
            </button>
          );
        })}
      </div>
    </WorkbenchCard>
  );
}

export function TodoBoard({ categories, activeCategory, onCategoryChange, onOpenPage, onFeedback }) {
  const todos = categories[activeCategory] ?? [];
  return (
    <WorkbenchCard title="待办">
      <div className="flex h-9 items-center gap-4 border-b border-erp-border-light px-4">
        {Object.keys(categories).map((category) => (
          <button key={category} type="button" className={cn('relative h-full text-[12px]', activeCategory === category ? 'font-medium text-erp-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-erp-primary' : 'text-erp-text-muted hover:text-erp-text-section')} onClick={() => onCategoryChange(category)}>{category}</button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-4">
        {todos.map((todo) => (
          <button key={todo.label} type="button" className="group flex min-h-[96px] min-w-0 flex-col items-stretch justify-between rounded-erp-control border border-erp-border-light bg-erp-surface-panel px-4 py-3.5 text-left transition-colors hover:border-erp-primary/30 hover:bg-erp-primary-soft" onClick={() => todo.pageId ? onOpenPage?.(todo.pageId) : onFeedback?.(todo.action)}>
            <div className="flex items-start justify-between gap-2">
              <span className={cn('flex h-9 min-w-9 shrink-0 items-center justify-center rounded-erp-control px-2 text-[18px] font-semibold', todoTones[todo.tone] ?? todoTones.primary)}>{todo.count}</span>
              <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-erp-text-placeholder transition-transform group-hover:translate-x-0.5 group-hover:text-erp-primary" strokeWidth={1.8} />
            </div>
            <span className="min-w-0 truncate text-[11px] font-medium text-erp-text-section">{todo.label}</span>
          </button>
        ))}
      </div>
    </WorkbenchCard>
  );
}

export function RealtimeOverview({ metrics }) {
  return (
    <WorkbenchCard title="实时数据" extra={<span className="text-[11px] text-erp-text-muted">本日 · 实时</span>}>
      <div className="grid grid-cols-2 divide-x divide-erp-border-light px-1 py-4 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="min-w-0 px-4 first:pl-3 last:pr-3">
            <p className="truncate text-[11px] text-erp-text-muted">{metric.label}</p>
            <p className="mt-2 truncate text-[18px] font-semibold text-erp-text-title">{metric.value}</p>
            <p className="mt-1 truncate text-[10px] text-erp-text-placeholder">{metric.description}</p>
          </div>
        ))}
      </div>
    </WorkbenchCard>
  );
}

export function PurchaseTargetCard() {
  return (
    <WorkbenchCard title="采购执行概览" extra={<button type="button" className="text-[11px] text-erp-text-muted hover:text-erp-primary">查看详情</button>} className="flex h-full flex-col">
      <div className="flex flex-1 flex-col justify-center p-4">
        <div className="flex items-center justify-between text-[11px] text-erp-text-muted"><span>本月采购执行进度</span><span className="font-medium text-erp-primary">68%</span></div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-erp-primary-soft"><div className="h-full w-[68%] rounded-full bg-erp-primary" /></div>
        <div className="mt-10 grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[18px] font-semibold text-erp-text-title">38</p><p className="mt-1 text-[10px] text-erp-text-muted">已下单</p></div>
          <div><p className="text-[18px] font-semibold text-erp-text-title">24</p><p className="mt-1 text-[10px] text-erp-text-muted">已入库</p></div>
          <div><p className="text-[18px] font-semibold text-erp-text-title">14</p><p className="mt-1 text-[10px] text-erp-text-muted">待入库</p></div>
        </div>
      </div>
    </WorkbenchCard>
  );
}

export function LineTrendChart({ data = [] }) {
  const width = 720;
  const height = 220;
  const pad = { top: 14, right: 28, bottom: 30, left: 38 };
  const chartWidth = width - pad.left - pad.right;
  const chartHeight = height - pad.top - pad.bottom;
  const maxValue = Math.ceil(Math.max(...data.map((item) => item.value), 100) / 20) * 20;
  const points = data.map((item, index) => ({
    ...item,
    x: pad.left + (index / Math.max(data.length - 1, 1)) * chartWidth,
    y: pad.top + (1 - item.value / maxValue) * chartHeight,
  }));
  const pointString = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaString = `${pad.left},${height - pad.bottom} ${pointString} ${width - pad.right},${height - pad.bottom}`;

  return (
    <div className="px-4 pb-3 pt-3">
      <div className="mb-1 flex items-baseline gap-2"><span className="text-[19px] font-semibold text-erp-text-title">¥138,000</span><span className="text-[11px] text-erp-success">本月累计 +18.4%</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-[204px] w-full" role="img" aria-label="采购金额趋势折线图">
        <defs><linearGradient id="purchase-trend-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4d7ff2" stopOpacity="0.2" /><stop offset="100%" stopColor="#4d7ff2" stopOpacity="0.02" /></linearGradient></defs>
        {[0, 1, 2, 3].map((step) => {
          const y = pad.top + (step / 3) * chartHeight;
          const label = Math.round(maxValue - (step / 3) * maxValue);
          return <g key={step}><line x1={pad.left} x2={width - pad.right} y1={y} y2={y} stroke="rgb(226 229 238)" strokeDasharray="3 4" /><text x={pad.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="rgb(145 151 169)">{label}</text></g>;
        })}
        <polygon points={areaString} fill="url(#purchase-trend-fill)" />
        <polyline points={pointString} fill="none" stroke="#4d7ff2" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
        {points.map((point) => <g key={point.label}><circle cx={point.x} cy={point.y} r="3.5" fill="#fff" stroke="#4d7ff2" strokeWidth="2" /><text x={point.x} y={height - 8} textAnchor="middle" fontSize="10" fill="rgb(145 151 169)">{point.label}</text></g>)}
      </svg>
    </div>
  );
}

export function WarningPanel({ warnings, onFeedback }) {
  return (
    <WorkbenchCard title="预警信息" extra={<button type="button" className="text-[11px] text-erp-primary hover:text-erp-primary-hover" onClick={() => onFeedback?.('预警中心将在后续模块接入')}>展开更多</button>}>
      <div className="divide-y divide-erp-border-light px-4">
        {warnings.map((warning) => <button key={warning.label} type="button" className="flex h-9 w-full items-center gap-2 text-left hover:text-erp-primary" onClick={() => onFeedback?.(`${warning.label}将在后续模块接入`)}><span className={cn('w-7 text-right text-[15px] font-semibold', warningTones[warning.tone])}>{warning.count}</span><span className="min-w-0 flex-1 truncate text-[11px] text-erp-text-muted">{warning.label}</span><ArrowRight className="h-3.5 w-3.5 text-erp-text-placeholder" strokeWidth={1.8} /></button>)}
      </div>
    </WorkbenchCard>
  );
}

export function AnnouncementPanel({ announcements, onFeedback }) {
  return (
    <WorkbenchCard title="产品公告" extra={<button type="button" className="text-[11px] text-erp-primary" onClick={() => onFeedback?.('公告中心将在后续模块接入')}>更多</button>}>
      <div className="space-y-3 px-4 py-4">{announcements.map((announcement) => <button key={announcement} type="button" className="block w-full text-left text-[11px] leading-5 text-erp-text-muted hover:text-erp-primary" onClick={() => onFeedback?.(announcement)}>{announcement}</button>)}</div>
    </WorkbenchCard>
  );
}

export function KnowledgePanel({ links, onFeedback }) {
  return (
    <WorkbenchCard title="知识中心" extra={<button type="button" className="text-[11px] text-erp-primary" onClick={() => onFeedback?.('知识中心将在后续模块接入')}>更多</button>}>
      <div className="divide-y divide-erp-border-light px-4">{links.map((link) => <button key={link} type="button" className="flex h-9 w-full items-center justify-between text-left text-[11px] text-erp-text-muted hover:text-erp-primary" onClick={() => onFeedback?.(`${link}将在后续模块接入`)}><span className="truncate">{link}</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-erp-text-placeholder" strokeWidth={1.8} /></button>)}</div>
    </WorkbenchCard>
  );
}
