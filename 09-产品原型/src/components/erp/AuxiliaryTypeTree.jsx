import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { ClearableInput } from '../ui/input.jsx';
import { cn } from '../../lib/utils.js';

export function AuxiliaryTypeTree({ groups, selectedType, onSelect }) {
  const [keyword, setKeyword] = useState('');
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const filteredGroups = useMemo(() => {
    const text = keyword.trim().toLowerCase();
    if (!text) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => item.label.toLowerCase().includes(text)),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, keyword]);

  function toggleGroup(groupName) {
    setCollapsedGroups((current) => ({ ...current, [groupName]: !current[groupName] }));
  }

  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-erp-border-header bg-erp-surface-panel">
      <div className="border-b border-erp-border-header p-3">
        <ClearableInput
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onClear={() => setKeyword('')}
          placeholder="搜索资料类型"
          aria-label="搜索资料类型"
          className="h-8"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {filteredGroups.map((group) => {
          const collapsed = collapsedGroups[group.group];
          return (
            <div key={group.group} className="mb-2">
              <button
                type="button"
                className="flex w-full items-center gap-1 rounded px-2 py-1.5 text-left text-[12px] font-semibold text-erp-text hover:bg-erp-surface-muted"
                onClick={() => toggleGroup(group.group)}
              >
                {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <span>{group.group}</span>
              </button>
              {!collapsed && (
                <div className="mt-0.5 space-y-0.5 pl-2">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cn(
                        'flex w-full items-center rounded px-2 py-1.5 text-left text-[12px] transition-colors',
                        selectedType === item.id
                          ? 'bg-erp-primary-soft font-semibold text-erp-primary'
                          : 'text-erp-text hover:bg-erp-surface-muted hover:text-erp-primary',
                      )}
                      onClick={() => onSelect(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {!filteredGroups.length && (
          <div className="flex flex-col items-center gap-2 px-2 py-8 text-center text-[12px] text-erp-text-muted">
            <Search className="h-4 w-4" />
            <span>没有匹配的资料类型</span>
          </div>
        )}
      </div>
    </aside>
  );
}
