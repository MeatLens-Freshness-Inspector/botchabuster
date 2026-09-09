import type { ReactNode } from "react";
import React from "react";
import { Camera, ClipboardList, MessageSquare, UserRound } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export type TutorialAppTab = "inspect" | "history" | "messages" | "profile";

interface TutorialAppShellProps {
  activeTab: TutorialAppTab;
  title: string;
  subtitle: string;
  children: ReactNode;
}

const tutorialTabs = [
  { id: "inspect", label: "Inspect", icon: Camera },
  { id: "history", label: "History", icon: ClipboardList },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: UserRound },
] as const;

const tutorialTabIcons = {
  inspect: Camera,
  history: ClipboardList,
  messages: MessageSquare,
  profile: UserRound,
} as const;

export function TutorialAppShell({
  activeTab,
  title,
  subtitle,
  children,
}: TutorialAppShellProps) {
  const HeaderIcon = tutorialTabIcons[activeTab];

  return (
    <div
      data-tutorial-app-shell
      className="flex min-h-full flex-col bg-[hsl(var(--background))]"
    >
      <div className="flex items-center justify-between px-4 py-1 text-[9px] text-muted-foreground">
        <span>9:41</span>
        <span>Online · Battery</span>
      </div>

      <header className="border-b border-border/60 bg-card/90 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-[hsl(var(--primary)/0.16)]">
            <HeaderIcon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-xs font-semibold">{title}</p>
            <p className="text-[9px] text-muted-foreground">{subtitle}</p>
          </div>
        </div>
      </header>

      <div data-tutorial-app-content className="min-h-0 flex-1 overflow-y-auto">
        {children}
      </div>

      <nav
        aria-label="Tutorial app navigation"
        data-tutorial-bottom-nav
        className="flex flex-shrink-0 items-stretch justify-between gap-1 border-t border-border bg-card px-1.5 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]"
      >
        {tutorialTabs.map(({ id, label, icon: Icon }) => {
          const isActive = id === activeTab;

          return (
            <button
              type="button"
              key={id}
              data-tutorial-tab={id}
              data-active={isActive ? "true" : "false"}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 rounded-lg px-1 py-1.5",
                isActive ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="truncate font-display text-[9px] uppercase tracking-wider">
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
