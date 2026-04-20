import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DashboardNavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
}

interface DashboardNavProps {
  items: DashboardNavItem[];
  active: string;
  onChange: (value: string) => void;
}

const DashboardNav = ({ items, active, onChange }: DashboardNavProps) => {
  return (
    <>
      {/* Mobile: wrapping grid */}
      <div className="lg:hidden">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {items.map((item) => {
            const isActive = active === item.value;
            return (
              <button
                key={item.value}
                onClick={() => onChange(item.value)}
                className={cn(
                  "relative flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-2 py-2.5 text-xs font-semibold transition-all",
                  isActive
                    ? "bg-hero text-hero-foreground shadow-md"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.badge !== undefined && Number(item.badge) > 0 && (
                  <span className="absolute -top-1 -right-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold leading-none text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: horizontal top navigation */}
      <nav className="hidden lg:block">
        <div className="sticky top-4 z-10 flex flex-wrap items-center gap-1.5 rounded-3xl border bg-card p-2 shadow-sm">
          {items.map((item) => {
            const isActive = active === item.value;
            return (
              <button
                key={item.value}
                onClick={() => onChange(item.value)}
                className={cn(
                  "relative flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-hero text-hero-foreground shadow-md"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                <span className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-xl",
                  isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                )}>
                  <item.icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
                {item.badge !== undefined && Number(item.badge) > 0 && (
                  <span className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-bold leading-none",
                    isActive ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default DashboardNav;
