// Loads the website's .env / .env.local (the AI API keys) before any route
// module is imported, the same way `next dev` would. Nothing is printed.
import path from "node:path";
import { loadEnvConfig } from "@next/env";

// Vitest sets NODE_ENV=test, and in test mode @next/env deliberately skips
// .env.local — which is where the real keys live. Load as a dev server does.
const previous = process.env.NODE_ENV;
Object.assign(process.env, { NODE_ENV: "development" });
loadEnvConfig(path.resolve(__dirname, "../../.."), true, { info: () => {}, error: console.error }, true);
Object.assign(process.env, { NODE_ENV: previous });
