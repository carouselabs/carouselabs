/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "x" in the X extension's build (vite.x.config.ts); unset for LinkedIn.
  readonly VITE_ENGAGE_PLATFORM?: string;
}
