import { Bell, Database, Download, FileText, Megaphone, Package, Receipt, Tags, Upload } from 'lucide-react';
import { cn } from '../../lib/utils.js';

const tagStyles = {
  采购: { className: 'bg-[#E8F1FE] text-[#1D4ED8]', icon: FileText },
  库存: { className: 'bg-[#E4F5E9] text-[#1F7A34]', icon: Package },
  主数据: { className: 'bg-[#F0EBFF] text-[#5B3EC8]', icon: Database },
  价格: { className: 'bg-[#FFF3E0] text-[#A34E00]', icon: Tags },
  结算: { className: 'bg-[#FFF7E0] text-[#8A6100]', icon: Receipt },
  公告: { className: 'bg-[#ECEFF5] text-[#48506B]', icon: Megaphone },
  导入: { className: 'bg-[#E3F4F4] text-[#0F766E]', icon: Upload },
  导出: { className: 'bg-[#EAEDFC] text-[#3F51B5]', icon: Download },
  系统: { className: 'bg-[#F0F1F5] text-[#555871]', icon: Bell },
};

export function NotificationTag({ tag, className, showIcon = true }) {
  const style = tagStyles[tag] || tagStyles.系统;
  const Icon = style.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-erp-status px-1.5 py-0.5 text-[11px] leading-4', style.className, className)}>
      {showIcon && <Icon className="h-3 w-3" strokeWidth={2} />}
      {tag}
    </span>
  );
}
