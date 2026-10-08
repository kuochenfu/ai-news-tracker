import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ground: "var(--ground)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-2": "var(--ink-2)",
        "ink-3": "var(--ink-3)",
        rule: "var(--rule)",
        "rule-strong": "var(--rule-strong)",
        shell: "var(--shell)",
        "shell-ink": "var(--shell-ink)",
        "shell-ink-2": "var(--shell-ink-2)",
        "shell-rule": "var(--shell-rule)",
        link: "var(--link)",
        warn: "var(--warn)",
        fault: "var(--fault)",
        ok: "var(--ok)"
      },
      fontFamily: {
        sans: ["var(--font-latin)", "var(--font-cjk)", "PingFang TC", "Microsoft JhengHei", "sans-serif"]
      },
      fontSize: {
        meta: ["0.75rem", { lineHeight: "1.1rem" }],
        body: ["0.875rem", { lineHeight: "1.35rem" }],
        head: ["1rem", { lineHeight: "1.5rem" }]
      }
    }
  },
  plugins: []
};

export default config;
