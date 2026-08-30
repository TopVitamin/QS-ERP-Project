import { getFieldControlClassName } from './field.jsx';
import { cn } from '../../lib/utils.js';

export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(getFieldControlClassName(), 'h-7 resize-none items-center py-0', className)}
      {...props}
    />
  );
}
