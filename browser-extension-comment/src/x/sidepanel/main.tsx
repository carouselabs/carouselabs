import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
// One design for both extensions: the LinkedIn panel's tokens and styles,
// then X's black and white colours over them.
import "../../sidepanel/styles.css";
import "./x-theme.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
