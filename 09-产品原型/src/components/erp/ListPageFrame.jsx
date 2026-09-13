import { BulkActionBar } from './BulkActionBar.jsx';
import { DataTable } from './DataTable.jsx';
import { InnerTabs } from './InnerTabs.jsx';
import { ListPageHeader } from './ListPageHeader.jsx';
import { PaginationBar } from './PaginationBar.jsx';

export function ListPageFrame({ header, tabs, toolbar, table, pagination }) {
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-erp-surface">
      <ListPageHeader {...header} />
      <div className="flex min-h-0 flex-1 flex-col bg-erp-surface px-4 pt-3">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-erp-section bg-erp-surface-panel">
          {tabs && <InnerTabs {...tabs} />}
          <BulkActionBar {...toolbar} />
          <DataTable {...table} />
          <PaginationBar {...pagination} />
        </section>
      </div>
    </main>
  );
}
