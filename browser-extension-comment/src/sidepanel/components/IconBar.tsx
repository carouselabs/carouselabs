import { MessageSquare, MessagesSquare, PenLine, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Screen } from "../types";

// The panel's bottom bar: four places instead of the old six icons down the
// side. History, Settings and Account live inside Profile now (its own tabs,
// ProfileScreen), so Profile is the current tab on any of those screens.
const TABS: { id: Screen; label: string; icon: LucideIcon; covers: Screen[] }[] = [
  { id: "home", label: "Write", icon: PenLine, covers: ["home"] },
  // Two bubbles, so it can't be mistaken for the single-bubble logo.
  { id: "messages", label: "Messages", icon: MessagesSquare, covers: ["messages"] },
  { id: "profiles", label: "Voices", icon: MessageSquare, covers: ["profiles"] },
  { id: "account", label: "Profile", icon: UserRound, covers: ["account", "history", "settings"] },
];

interface IconBarProps {
  activeScreen: Screen;
  onSelect: (screen: Screen) => void;
  // The screens this panel has (Reddit's has no Messages); all by default.
  screens?: Screen[];
  // A screen with something for the person right now (Messages while a
  // conversation is open), marked with a dot until they go there.
  attention?: { screen: Screen; description: string } | null;
}

export function IconBar({ activeScreen, onSelect, attention, screens }: IconBarProps) {
  const tabs = TABS.filter(({ id }) => !screens || screens.includes(id));

  return (
    <nav
      aria-label="Screens"
      className="grid shrink-0 gap-1 border-t border-border bg-card px-2 py-1.5"
      style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
    >
      {tabs.map(({ id, label, icon: Icon, covers }) => {
        const isActive = covers.includes(activeScreen);
        const flagged = attention?.screen === id && !isActive;

        return (
          <button
            key={id}
            type="button"
            // The name is just the label: the attention note below is a
            // description, not part of it.
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            aria-describedby={flagged ? `attention-${id}` : undefined}
            onClick={() => onSelect(id)}
            className={cn(
              "relative flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-medium text-muted-foreground transition-[color,background-color,transform] duration-fast ease-out hover:bg-muted hover:text-foreground active:scale-95",
              isActive &&
                "panel-night font-semibold text-[hsl(var(--night-foreground))] hover:bg-[hsl(var(--night))] hover:text-[hsl(var(--night-foreground))]",
            )}
          >
            <Icon aria-hidden className="h-4 w-4" strokeWidth={isActive ? 2.25 : 1.9} />
            {label}
            {flagged && (
              <>
                <span
                  aria-hidden
                  data-testid={`attention-dot-${id}`}
                  className="absolute right-[calc(50%-1.1rem)] top-1.5 h-2 w-2 animate-fade-in rounded-full bg-primary ring-2 ring-card"
                />
                <span id={`attention-${id}`} className="sr-only">
                  {attention?.description}
                </span>
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}
