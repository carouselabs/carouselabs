export type Screen = "home" | "messages" | "profiles" | "history" | "settings" | "account";

export const SCREENS: { id: Screen; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "messages", label: "Messages" },
  { id: "profiles", label: "Profiles" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
  { id: "account", label: "Account" },
];
