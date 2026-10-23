import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { onSignedOut } from "@/lib/api";
import { clearAccountData } from "@/lib/account";
// One design for every extension: the LinkedIn panel's tokens and styles,
// then Reddit's orange over them.
import "../../sidepanel/styles.css";
import "./reddit-theme.css";

// The server stopped accepting this browser's token (signed out on the
// website or by an admin): sign out here too, so the panel shows Sign in
// instead of failing every request. App watches the token.
onSignedOut(() => void clearAccountData());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
