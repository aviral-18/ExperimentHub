import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  FlaskConical,
  Plus,
  GitCompareArrows,
  BookOpen,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/experiments", label: "Experiments", icon: FlaskConical, end: false },
  { to: "/experiments/new", label: "New Experiment", icon: Plus, end: false },
  { to: "/compare", label: "Compare", icon: GitCompareArrows, end: false },
  { to: "/metrics", label: "Metrics Guide", icon: BookOpen, end: false },
];

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-surface/60 backdrop-blur-xl">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <FlaskConical className="size-5 text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-bold tracking-tight">ExperimentOS</div>
          <div className="text-[11px] text-muted-foreground">Experimentation Platform</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-elevated text-foreground border border-border shadow-sm"
                  : "text-muted-foreground hover:bg-elevated/60 hover:text-foreground"
              )
            }
          >
            <Icon className="size-[18px] shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Upsell / help card */}
      <div className="mx-3 mb-3 rounded-xl border border-border bg-gradient-to-br from-primary/10 to-accent/5 p-3.5">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="size-4 text-primary" /> AI Analyst
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Every experiment ships with an auto-generated executive analysis and launch call.
        </p>
      </div>

      {/* User */}
      <div className="flex items-center gap-3 border-t border-border px-4 py-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-full bg-elevated text-sm font-semibold text-primary">
          {user?.full_name?.[0] ?? "U"}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-sm font-medium">{user?.full_name}</div>
          <div className="truncate text-xs text-muted-foreground">{user?.role}</div>
        </div>
        <button
          onClick={logout}
          className="text-muted-foreground transition-colors hover:text-danger"
          title="Log out"
        >
          <LogOut className="size-[18px]" />
        </button>
      </div>
    </aside>
  );
}
