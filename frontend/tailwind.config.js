/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens mapped to CSS variables (see index.css).
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        card: "hsl(var(--card))",
        elevated: "hsl(var(--elevated))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        info: "hsl(var(--info))",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 6px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        glass: "0 1px 0 0 hsl(0 0% 100% / 0.04) inset, 0 8px 30px -12px hsl(0 0% 0% / 0.6)",
        glow: "0 0 0 1px hsl(var(--primary) / 0.25), 0 8px 40px -8px hsl(var(--primary) / 0.35)",
        card: "0 1px 2px 0 hsl(0 0% 0% / 0.3), 0 8px 24px -12px hsl(0 0% 0% / 0.5)",
      },
      backgroundImage: {
        "grid-faint":
          "linear-gradient(hsl(var(--border) / 0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.4) 1px, transparent 1px)",
        "radial-glow":
          "radial-gradient(600px circle at var(--x,50%) var(--y,0%), hsl(var(--primary) / 0.12), transparent 40%)",
      },
      keyframes: {
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.5)" },
          "70%": { boxShadow: "0 0 0 8px hsl(var(--primary) / 0)" },
          "100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1)",
        shimmer: "shimmer 1.6s infinite",
        "pulse-ring": "pulse-ring 2s infinite",
      },
    },
  },
  plugins: [],
};
