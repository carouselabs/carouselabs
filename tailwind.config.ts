import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", ".dark"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background:    "var(--background)",
        foreground:    "var(--foreground)",
        sidebar:       "var(--sidebar)",
        card: {
          DEFAULT:     "var(--card)",
          foreground:  "var(--card-foreground)",
        },
        popover: {
          DEFAULT:     "var(--popover)",
          foreground:  "var(--popover-foreground)",
        },
        primary: {
          DEFAULT:     "var(--primary)",
          foreground:  "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT:     "var(--secondary)",
          foreground:  "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT:     "var(--muted)",
          foreground:  "var(--muted-foreground)",
        },
        accent: {
          DEFAULT:     "var(--accent)",
          foreground:  "var(--accent-foreground)",
          light:       "var(--accent-light)",
        },
        destructive:   "var(--destructive)",
        border:        "var(--border)",
        input:         "var(--input)",
        ring:          "var(--ring)",
        success:       "var(--success)",
      },
      borderRadius: {
        sm:  "calc(var(--radius) * 0.6)",
        md:  "calc(var(--radius) * 0.8)",
        lg:  "var(--radius)",
        xl:  "calc(var(--radius) * 1.4)",
        "2xl": "calc(var(--radius) * 1.8)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
