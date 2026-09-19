import { useState } from 'react';
import { DetailField, EditorCard } from './DocumentDetailFrame.jsx';
import {
  detailTabFieldGridClassName,
  detailTabListClassName,
  detailTabPanelClassName,
  detailTabSectionClassName,
} from './detailTabSection.js';
import { InnerTabs } from './InnerTabs.jsx';
import { OperationLogTable } from './OperationLogTable.jsx';
import { cn } from '../../lib/utils.js';

function DetailFieldGrid({ fields, className = detailTabFieldGridClassName }) {
  return (
    <div className={className}>
      {fields.map(({ key, label, value, className: fieldClassName }) => (
        <DetailField key={key || label} label={label} value={value} className={fieldClassName} />
      ))}
    </div>
  );
}

function resolveTabFields(tab, context) {
  const fields = typeof tab.fields === 'function' ? tab.fields(context) : tab.fields;
  return fields || [];
}

function resolveLogEntries(tab, context) {
  if (typeof tab.logEntries === 'function') return tab.logEntries(context) || [];
  return tab.logEntries || [];
}

/**
 * 单据详情底部「操作信息」：制单信息 / 操作日志 胶囊 Tab 切换。
 * 操作日志以时间线表格展示；条目可由 logEntries 提供或从单据字段推导。
 */
export function DocumentMetaTabsCard({
  title = '操作信息',
  tabs = [],
  context,
  defaultTab,
}) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key || '');
  if (!tabs.length) return null;

  const activeSection = tabs.find((tab) => tab.key === activeTab) || tabs[0];
  const fields = resolveTabFields(activeSection, context);
  const logEntries = resolveLogEntries(activeSection, context);
  const isLogTab = activeSection.key === 'log' || activeSection.variant === 'log';
  const tabItems = tabs.map((tab) => ({
    value: tab.key,
    label: tab.label,
  }));

  return (
    <EditorCard title={title}>
      <div className={detailTabSectionClassName}>
        <InnerTabs
          variant="pill"
          className={detailTabListClassName}
          items={tabItems}
          value={activeSection.key}
          onChange={setActiveTab}
        />
        <div className={detailTabPanelClassName}>
          {isLogTab || activeSection.logEntries != null
            ? (
              <OperationLogTable
                entries={logEntries}
                emptyText={activeSection.emptyText || '暂无操作记录'}
              />
            )
            : fields.length
              ? <DetailFieldGrid fields={fields} />
              : (
                <div className="flex min-h-[120px] items-center justify-center text-[12px] text-erp-text-muted">
                  {activeSection.emptyText || '暂无操作记录'}
                </div>
              )}
        </div>
      </div>
    </EditorCard>
  );
}

export function buildCreateMetaFields(row) {
  return [
    { key: 'creator', label: '创建人', value: row.creator },
    { key: 'createdAt', label: '创建时间', value: row.createdAt },
    { key: 'updater', label: '最后更新人', value: row.updater },
    { key: 'updatedAt', label: '最后更新时间', value: row.updatedAt },
  ];
}
