import { useEffect, useMemo, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, Dialog, DialogContent, DialogTitle } from '../ui/index.js';
import { defaultNavItems } from '../../config/nav.js';

/**
 * 全局搜索：只搜菜单，做页面快速导航。
 *
 * 数据来自 `config/nav.js`，菜单增删自动跟着变；后置菜单不在 nav 里，自然搜不到。
 * 交互对齐常见 ERP 习惯：⌘/Ctrl + K 或 / 唤起，↑↓ 选择，回车打开，Esc 关闭。
 * “/” 要避开输入框和已打开的下拉、弹窗，否则在筛选框里打字会误触。
 * 注意：需求稿里还没有「全局搜索」这个功能（只有辅助资料树内搜索），这是原型先行，范围只限菜单导航。
 */

const groupHeadingClassName =
  '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-normal [&_[cmdk-group-heading]]:text-erp-text-muted';

function buildSections(navItems) {
  return navItems.map((navItem) => ({
    title: navItem.label,
    items: navItem.groups?.length
      ? navItem.groups.flatMap((group) =>
          group.items.map((item) => ({ ...item, keywords: [navItem.label, group.title] })),
        )
      : [{ label: navItem.label, pageId: navItem.id, tag: navItem.tag, keywords: [navItem.label] }],
  }));
}

function isTypingTarget(target) {
  if (!target || typeof target.tagName !== 'string') return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable === true;
}

function hasOpenOverlay() {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="menu"][data-state="open"], [role="listbox"]'));
}

export function GlobalSearch({ onOpenPage }) {
  const [open, setOpen] = useState(false);
  const sections = useMemo(() => buildSections(defaultNavItems), []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.isComposing) return;
      const isCommandK = (event.metaKey || event.ctrlKey) && event.key?.toLowerCase() === 'k';
      const isSlash = event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey;
      if (!isCommandK && !isSlash) return;
      // “/” 只在非输入状态、且没有别的下拉或弹窗打开时才抢。
      if (isSlash && (isTypingTarget(event.target) || hasOpenOverlay())) return;
      event.preventDefault();
      setOpen((value) => !value);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSelect(pageId) {
    setOpen(false);
    onOpenPage?.(pageId);
  }

  return (
    <>
      <button
        type="button"
        aria-label="全局搜索"
        title="全局搜索（⌘K 或 /）"
        className="flex h-7 w-7 items-center justify-center rounded-erp-control bg-erp-text-muted text-white hover:bg-erp-text"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          showClose={false}
          className="top-[12%] flex max-h-[min(560px,calc(100vh-120px))] w-[min(560px,calc(100vw-32px))] translate-y-0 flex-col gap-0 overflow-hidden p-0"
        >
          <DialogTitle className="sr-only">全局搜索</DialogTitle>
          <Command>
            <CommandInput autoFocus placeholder="搜索菜单，回车打开" wrapperClassName="h-11 gap-2.5 px-3" iconClassName="size-4" className="text-[13px]" />
            <CommandList className="max-h-[min(420px,56vh)] p-1.5">
              <CommandEmpty>没有找到匹配的菜单</CommandEmpty>
              {sections.map((section) => (
                <CommandGroup key={section.title} heading={section.title} className={`p-1 ${groupHeadingClassName}`}>
                  {section.items.map((item) => (
                    <CommandItem
                      key={item.pageId}
                      value={item.label}
                      keywords={item.keywords}
                      className="h-8 gap-2"
                      onSelect={() => handleSelect(item.pageId)}
                    >
                      <span className="truncate">{item.label}</span>
                      {item.tag && (
                        <span className="ml-auto shrink-0 rounded-[3px] border border-erp-border-strong px-1 text-[10px] leading-4 text-erp-text-muted">
                          {item.tag}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <div className="flex shrink-0 items-center justify-between border-t border-erp-border-light px-3 py-1.5 text-[11px] text-erp-text-muted">
              <span className="flex items-center gap-3">
                <span>↑↓ 选择</span>
                <span className="flex items-center gap-1">
                  <CornerDownLeft className="h-3 w-3" strokeWidth={1.8} />
                  打开
                </span>
                <span>Esc 关闭</span>
              </span>
              <span>⌘K 或 / 唤起</span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  );
}
