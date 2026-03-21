import * as React from "react";
import { cn } from "@/lib/utils";

export const CyberCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' | 'warning' }>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative bg-card border rounded-xl overflow-hidden transition-all duration-200",
          variant === 'default' && "border-border hover:border-primary/30",
          variant === 'destructive' && "border-destructive/25 bg-destructive/5",
          variant === 'warning' && "border-warning/25 bg-warning/5",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CyberCard.displayName = "CyberCard";

export const CyberButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' }>(
  ({ className, variant = 'primary', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed",
          variant === 'primary' && "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20",
          variant === 'secondary' && "bg-secondary text-foreground border border-border hover:border-primary/40 hover:text-primary",
          variant === 'ghost' && "text-muted-foreground hover:text-foreground hover:bg-secondary",
          variant === 'destructive' && "bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/20",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
CyberButton.displayName = "CyberButton";

export const CyberBadge = ({ children, variant = 'healthy', className }: {
  children: React.ReactNode;
  variant?: 'healthy' | 'warning' | 'threat' | 'offline' | 'outline';
  className?: string;
}) => {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium",
      variant === 'healthy' && "bg-healthy/12 text-healthy",
      variant === 'warning' && "bg-warning/12 text-warning",
      variant === 'threat' && "bg-destructive/12 text-destructive",
      variant === 'offline' && "bg-muted text-muted-foreground",
      variant === 'outline' && "bg-secondary text-foreground border border-border",
      className
    )}>
      <span className={cn(
        "w-1.5 h-1.5 rounded-full shrink-0",
        variant === 'healthy' && "bg-healthy",
        variant === 'warning' && "bg-warning",
        variant === 'threat' && "bg-destructive",
        variant === 'offline' && "bg-muted-foreground",
        variant === 'outline' && "hidden",
      )} />
      {children}
    </span>
  );
};

export const CyberInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-9 w-full rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all",
          className
        )}
        {...props}
      />
    );
  }
);
CyberInput.displayName = "CyberInput";
