import { Check } from 'lucide-react';
import { cn } from '../../lib/utils.js';

export function WizardSteps({ steps = [], current = 1 }) {
  return (
    <ol className="flex flex-wrap items-center gap-y-2">
      {steps.map((label, index) => {
        const number = index + 1;
        const done = number < current;
        const active = number === current;
        return (
          <li key={label} className="flex items-center">
            {index > 0 && <span className={cn('mx-2 h-px w-8', done || active ? 'bg-erp-primary' : 'bg-erp-border-light')} />}
            <span
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full text-[11px]',
                active ? 'bg-erp-primary font-medium text-white' : done ? 'bg-erp-primary-soft text-erp-primary' : 'bg-erp-surface-muted text-erp-text-muted',
              )}
            >
              {done ? <Check className="h-3 w-3" strokeWidth={2.4} /> : number}
            </span>
            <span className={cn('ml-1.5 text-[12px]', active ? 'font-medium text-erp-text-title' : 'text-erp-text-muted')}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
