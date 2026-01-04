import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground',
        outline: 'border border-input text-foreground',
        synced:
          'bg-drift-synced/10 text-drift-synced border border-drift-synced/30',
        modified:
          'bg-drift-modified/10 text-drift-modified border border-drift-modified/30',
        missing:
          'bg-drift-missing/10 text-drift-missing border border-drift-missing/30',
        added:
          'bg-drift-added/10 text-drift-added border border-drift-added/30',
        critical:
          'bg-red-500/10 text-red-500 border border-red-500/30',
        warning:
          'bg-yellow-500/10 text-yellow-500 border border-yellow-500/30',
        healthy:
          'bg-green-500/10 text-green-500 border border-green-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
