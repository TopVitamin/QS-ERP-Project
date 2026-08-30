import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '../ui/button.jsx';
import { Input } from '../ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.jsx';

export function PaginationBar({ total, selectedCount, currentPage, pageCount, pageSize, onPageChange, onPageSizeChange }) {
  const safePageCount = Math.max(pageCount, 1);

  function setPage(nextPage) {
    onPageChange(Math.min(Math.max(nextPage, 1), safePageCount));
  }

  function handlePageInput(event) {
    const value = Number(event.target.value.replace(/\D/g, '').slice(0, 3));
    if (value) setPage(value);
  }

  return (
    <footer className="flex h-12 shrink-0 items-center justify-between bg-erp-surface-panel px-4 text-[12px]">
      <div className="flex items-center gap-4 text-erp-text-subtle">
        <span>共{total}条</span>
        {selectedCount > 0 && <span className="text-erp-primary">已选{selectedCount}条</span>}
      </div>
      <div className="flex items-center gap-2 text-erp-text-muted">
        <span>共{safePageCount}页</span>
        <span>第</span>
        <Input variant="boxed" aria-label="当前页码" value={currentPage} onChange={handlePageInput} className="h-7 w-10 px-1 text-center" />
        <span>页</span>
        <Button variant="outline" size="icon" aria-label="第一页" disabled={currentPage <= 1} onClick={() => setPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="上一页" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="下一页" disabled={currentPage >= safePageCount} onClick={() => setPage(currentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
        <Button variant="outline" size="icon" aria-label="最后一页" disabled={currentPage >= safePageCount} onClick={() => setPage(safePageCount)}><ChevronsRight className="h-4 w-4" /></Button>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger variant="boxed" className="ml-2 w-28"><SelectValue /></SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="10">10条/页</SelectItem>
            <SelectItem value="20">20条/页</SelectItem>
            <SelectItem value="50">50条/页</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </footer>
  );
}
