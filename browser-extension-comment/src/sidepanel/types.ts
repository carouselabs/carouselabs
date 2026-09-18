export type Screen = "home" | "profiles" | "history" | "settings" | "account";

export const SCREENS: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "profiles", label: "Profiles" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
  { id: "account", label: "Account" },
];
