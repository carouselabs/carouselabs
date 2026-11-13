import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MonthActivity } from "../MonthActivity";
import { AccountScreen } from "./AccountScreen";
import { HistoryScreen } from "./HistoryScreen";

export type ProfileTab = "overview" | "history" | "settings";

const TABS: { id: ProfileTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

// Profile, the bottom bar's last tab: everything about you in one place,
// where History, Settings and Account used to be three icons. Overview is
// this month's comments per day and your plan and account; History and
// Settings are the screens they always were. `settings` is this extension's
// own Settings screen (LinkedIn's, X's or Reddit's).
export function ProfileScreen({ settings, initialTab = "overview" }: { settings: ReactNode; initialTab?: ProfileTab }) {
  const [tab, setTab] = useState<ProfileTab>(initialTab);

  return (
    <div className="flex flex-col">
      <div className="px-3 pt-3">
        <div role="group" aria-label="Profile" className="grid grid-cols-3 gap-1 rounded-full bg-muted p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-8 rounded-full px-3 text-xs font-medium text-muted-foreground transition-[color,background-color,box-shadow] duration-fast ease-out hover:text-foreground",
                tab === t.id && "bg-card font-semibold text-foreground shadow-sm",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <>
          <div className="px-3 pt-3">
            <MonthActivity />
          </div>
          <AccountScreen />
        </>
      )}
      {tab === "history" && <HistoryScreen />}
      {tab === "settings" && settings}
    </div>
  );
}
