import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, className, children }: PageHeaderProps) {
  return (
    <header className={cn("px-4 pt-4 pb-3 safe-top", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold uppercase tracking-wider">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}
