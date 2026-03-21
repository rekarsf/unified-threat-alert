import * as React from "react";
import { cn } from "@/lib/utils";

// --- Cyber Card ---
export const CyberCard = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' | 'warning' }>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative bg-card rounded-xl overflow-hidden backdrop-blur-md transition-all duration-300",
          variant === 'default' && "cyber-glow hover:cyber-glow-hover",
          variant === 'destructive' && "cyber-glow-destructive",
          variant === 'warning' && "cyber-glow-warning",
          className
        )}
        {...props}
      >
        {/* Top Accent Line */}
        <div className={cn(
          "absolute top-0 left-0 right-0 h-[2px] opacity-70",
          variant === 'default' && "bg-gradient-to-r from-transparent via-primary to-transparent",
          variant === 'destructive' && "bg-gradient-to-r from-transparent via-destructive to-transparent",
          variant === 'warning' && "bg-gradient-to-r from-transparent via-warning to-transparent"
        )} />
        {children}
      </div>
    );
  }
);
CyberCard.displayName = "CyberCard";

// --- Cyber Button ---
export const CyberButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' }>(
  ({ className, variant = 'primary', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "relative inline-flex items-center justify-center px-6 py-2.5 font-display font-semibold uppercase tracking-wider text-sm transition-all duration-200 overflow-hidden rounded-md group disabled:opacity-50 disabled:cursor-not-allowed",
          variant === 'primary' && "bg-primary/10 text-primary border border-primary/50 hover:bg-primary/20 hover:border-primary hover:shadow-[0_0_15px_rgba(45,212,160,0.4)]",
          variant === 'secondary' && "bg-secondary text-secondary-foreground border border-border hover:border-primary/50 hover:text-primary",
          variant === 'ghost' && "bg-transparent text-muted-foreground hover:text-primary hover:bg-primary/5",
          variant === 'destructive' && "bg-destructive/10 text-destructive border border-destructive/50 hover:bg-destructive/20 hover:border-destructive hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]",
          className
        )}
        {...props}
      >
        {/* Hover scanline effect */}
        {variant === 'primary' && (
          <span className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent -translate-y-full group-hover:animate-[scanline_1s_ease-in-out]" />
        )}
        <span className="relative z-10 flex items-center gap-2">{props.children}</span>
      </button>
    );
  }
);
CyberButton.displayName = "CyberButton";

// --- Cyber Badge ---
export const CyberBadge = ({ children, variant = 'healthy', className }: { children: React.ReactNode, variant?: 'healthy' | 'warning' | 'threat' | 'offline' | 'outline', className?: string }) => {
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-sm text-xs font-mono font-medium border uppercase tracking-wider",
      variant === 'healthy' && "bg-healthy/10 text-healthy border-healthy/30",
      variant === 'warning' && "bg-warning/10 text-warning border-warning/30",
      variant === 'threat' && "bg-destructive/10 text-destructive border-destructive/30 animate-pulse",
      variant === 'offline' && "bg-muted text-muted-foreground border-border",
      variant === 'outline' && "bg-transparent text-foreground border-border",
      className
    )}>
      {variant === 'healthy' && <span className="w-1.5 h-1.5 rounded-full bg-healthy mr-1.5" />}
      {variant === 'warning' && <span className="w-1.5 h-1.5 rounded-full bg-warning mr-1.5" />}
      {variant === 'threat' && <span className="w-1.5 h-1.5 rounded-full bg-destructive mr-1.5" />}
      {variant === 'offline' && <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground mr-1.5" />}
      {children}
    </span>
  );
};

// --- Cyber Input ---
export const CyberInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-border bg-input/50 px-3 py-2 text-sm text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/50 transition-all duration-200",
          className
        )}
        {...props}
      />
    );
  }
);
CyberInput.displayName = "CyberInput";
