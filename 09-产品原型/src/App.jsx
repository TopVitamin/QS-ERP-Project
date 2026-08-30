import { useEffect, useState } from 'react';
import { AppToaster, TooltipProvider } from './components/ui/index.js';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { TopHeader } from './components/layout/TopHeader.jsx';
import { PAGE_REGISTRY, resolvePageId } from './config/pages.js';
import { feedback } from './lib/feedback.js';
import { WorkbenchPage } from './pages/WorkbenchPage.jsx';

const DEFAULT_PAGE_ID = 'purchase-order';
const DEFAULT_VIEW_ID = 'home';

export function App() {
  const [openTabs, setOpenTabs] = useState([DEFAULT_PAGE_ID]);
  const [activeView, setActiveView] = useState(DEFAULT_VIEW_ID);
  const [pageContexts, setPageContexts] = useState({});
  const [theme, setTheme] = useState('blue');

  const activePage = activeView === 'home' ? null : activeView;
  const activeTitle = activePage ? PAGE_REGISTRY[activePage]?.title : '工作台';
  const activeNavItem = activePage?.startsWith('purchase-') ? 'purchase' : activePage ?? null;

  useEffect(() => {
    document.title = `强盛ERP - ${activeTitle}`;
  }, [activeTitle]);

  function openPage(target, context) {
    const pageId = resolvePageId(target);
    if (!pageId) {
      feedback.info(`${target} 模块将在后续页面接入`);
      return;
    }

    if (context) setPageContexts((current) => ({ ...current, [pageId]: context }));
    setOpenTabs((current) => (current.includes(pageId) ? current : [...current, pageId]));
    setActiveView(pageId);
  }

  function selectTab(pageId) {
    if (pageId === 'home') {
      setActiveView('home');
      return;
    }
    if (PAGE_REGISTRY[pageId]) {
      setActiveView(pageId);
    }
  }

  function closeTab(pageId) {
    setOpenTabs((current) => {
      if (current.length <= 1) return current;

      const nextTabs = current.filter((id) => id !== pageId);
      if (activeView === pageId) {
        const closedIndex = current.indexOf(pageId);
        const nextActive = nextTabs[Math.min(closedIndex, nextTabs.length - 1)] ?? DEFAULT_PAGE_ID;
        setActiveView(nextActive);
      }
      return nextTabs;
    });
  }

  function handleTabAction(action, pageId) {
    if (openTabs.length <= 1) return;
    const keepTab = openTabs.includes(pageId) ? pageId : openTabs[0];
    if (action === 'closeOthers' || action === 'closeAll') {
      setOpenTabs([keepTab]);
      setActiveView(keepTab);
    }
  }

  function showFeedback(message, type = 'message') {
    feedback[type]?.(message) ?? feedback.message(message);
  }

  return (
    <TooltipProvider delayDuration={300}>
    <div data-theme={theme} className="app-shell flex h-screen min-w-[1180px] overflow-hidden bg-erp-surface font-sans text-erp-text">
      <Sidebar activeItem={activeNavItem} activePageId={activePage} onSelect={openPage} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopHeader
          tabs={openTabs.map((id) => ({ id, title: PAGE_REGISTRY[id].title }))}
          activeView={activeView}
          onTabSelect={selectTab}
          onTabClose={closeTab}
          onTabAction={handleTabAction}
          onAction={showFeedback}
          theme={theme}
          onThemeChange={setTheme}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {activeView === 'home' ? (
            <WorkbenchPage onFeedback={showFeedback} onOpenPage={openPage} />
          ) : (
            openTabs.map((pageId) => {
              const Page = PAGE_REGISTRY[pageId].component;
              return (
                <div key={pageId} className={activeView === pageId ? 'flex h-full min-h-0 flex-col' : 'hidden'}>
                  <Page onFeedback={showFeedback} onOpenPage={openPage} context={pageContexts[pageId]} />
                </div>
              );
            })
          )}
        </div>
      </div>
      <AppToaster />
    </div>
    </TooltipProvider>
  );
}
