import { getFieldControlClassName } from './field.jsx';
import { cn } from '../../lib/utils.js';

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(getFieldControlClassName(), 'h-[58px] resize-none items-start py-1.5', className)}
      {...props}
    />
  );
}
