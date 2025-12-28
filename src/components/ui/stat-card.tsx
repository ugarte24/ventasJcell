import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'success' | 'warning';
  className?: string;
  layout?: 'default' | 'horizontal-title';
}

const variantStyles = {
  default: 'bg-card',
  primary: 'bg-primary/5 border-primary/20',
  success: 'bg-success/5 border-success/20',
  warning: 'bg-warning/5 border-warning/20',
};

const iconVariantStyles = {
  default: 'bg-secondary text-muted-foreground',
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};

export function StatCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon,
  trend,
  variant = 'default',
  className,
  layout = 'default'
}: StatCardProps) {
  if (layout === 'horizontal-title') {
    return (
      <div 
        className={cn(
          "relative overflow-hidden rounded-xl border p-4 sm:p-5 lg:p-6 shadow-card transition-all hover:shadow-soft animate-fade-in",
          variantStyles[variant],
          className
        )}
      >
        <div className="space-y-3 sm:space-y-4">
          {/* Primera fila: Título e icono */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-base sm:text-lg font-medium text-muted-foreground">{title}</p>
            {Icon && (
              <div className={cn(
                "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg shrink-0",
                iconVariantStyles[variant]
              )}>
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            )}
          </div>
          {/* Segunda fila: Valor */}
          <div className="space-y-1 sm:space-y-2">
            <p className="font-display text-lg sm:text-xl lg:text-2xl font-bold tracking-tight text-foreground break-words">
              {value}
            </p>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              )}>
                <span>{trend.isPositive ? '↑' : '↓'}</span>
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 sm:p-5 lg:p-6 shadow-card transition-all hover:shadow-soft animate-fade-in",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 sm:space-y-2 flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-medium text-muted-foreground">{title}</p>
          <p className="font-display text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              trend.isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg shrink-0",
            iconVariantStyles[variant]
          )}>
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        )}
      </div>
    </div>
  );
}
