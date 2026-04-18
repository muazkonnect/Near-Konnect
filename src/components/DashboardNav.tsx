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
      {/* Mobile: wrapping grid so all items are visible without horizontal scroll */}
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
                  <span className={cn(
                    "absolute -top-1 -right-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none",
                    isActive ? "bg-primary text-primary-foreground" : "bg-primary text-primary-foreground"
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden lg:block">
        <div className="sticky top-6 rounded-3xl border bg-card p-3">
          <p className="mb-2 px-3 pt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Manage</p>
          <nav className="space-y-1">
            {items.map((item) => {
              const isActive = active === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => onChange(item.value)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-hero text-hero-foreground shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary" />
                  )}
                  <span className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                    isActive ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground group-hover:bg-background"
                  )}>
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge !== undefined && Number(item.badge) > 0 && (
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold leading-none",
                      isActive ? "bg-primary text-primary-foreground" : "bg-primary/15 text-primary"
                    )}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
};

export default DashboardNav;
