import { Home, Users, History, Settings, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Screen } from "../types";
import { SCREENS } from "../types";

const ICONS: Record<Screen, LucideIcon> = {
  home: Home,
  profiles: Users,
  history: History,
  settings: Settings,
  account: UserCircle,
};

interface IconBarProps {
  activeScreen: Screen;
  onSelect: (screen: Screen) => void;
}

export function IconBar({ activeScreen, onSelect }: IconBarProps) {
  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-border py-2">
      {SCREENS.map(({ id, label }) => {
        const Icon = ICONS[id];
        const isActive = activeScreen === id;

        return (
          <button
            key={id}
            type="button"
            title={label}
            aria-label={label}
            aria-pressed={isActive}
            onClick={() => onSelect(id)}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
          </button>
        );
      })}
    </nav>
  );
}
