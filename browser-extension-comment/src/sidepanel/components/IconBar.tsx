import { Home, MessagesSquare, Users, History, Settings, UserCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { Screen } from "../types";
import { SCREENS } from "../types";

// Messages uses the two-bubble icon so it can't be mistaken for the
// single-bubble logo in the header.
const ICONS: Record<Screen, LucideIcon> = {
  home: Home,
  messages: MessagesSquare,
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
    <nav aria-label="Screens" className="flex w-12 shrink-0 flex-col items-center gap-1 border-l border-border py-2">
      {SCREENS.map(({ id, label }) => {
        const Icon = ICONS[id];
        const isActive = activeScreen === id;

        return (
          <Tooltip key={id} label={label} side="left">
            <button
              type="button"
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSelect(id)}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,transform] duration-fast ease-out hover:bg-muted hover:text-foreground active:scale-95",
                isActive && "bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.25 : 2} />
            </button>
          </Tooltip>
        );
      })}
    </nav>
  );
}
