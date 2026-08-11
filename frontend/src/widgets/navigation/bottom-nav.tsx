import React from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { Camera, ClipboardList, Shield, UserRound, MessageSquare } from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { to: "/inspect", icon: Camera, label: "Inspect" },
  { to: "/history", icon: ClipboardList, label: "History" },
  { to: "/messages", icon: MessageSquare, label: "Messages" },
];

export type BottomNavProps = {
  isAdmin: boolean;
};

export function BottomNav({ isAdmin }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card safe-bottom">
      <div className="mx-auto flex w-full max-w-md items-stretch justify-between gap-1 px-1.5 py-2 sm:px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <RouterNavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span className="truncate font-display text-[10px] uppercase tracking-wider">{label}</span>
          </RouterNavLink>
        ))}
        {isAdmin && (
          <RouterNavLink
            to="/admin"
            className={({ isActive }) =>
              cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Shield className="h-5 w-5" />
            <span className="truncate font-display text-[10px] uppercase tracking-wider">Admin</span>
          </RouterNavLink>
        )}
        <RouterNavLink
          to="/profile"
          className={({ isActive }) =>
            cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )
          }
        >
          <UserRound className="h-5 w-5" />
          <span className="truncate font-display text-[10px] uppercase tracking-wider">Profile</span>
        </RouterNavLink>
      </div>
    </nav>
  );
}
