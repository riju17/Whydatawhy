"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type Theme = "stamps" | "quilt" | "cozy" | "blue";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "mailbox-theme";

const applyThemeToDom = (next: Theme) => {
  const root = document.documentElement;
  root.dataset.theme = next;
};

export function ThemeProvider({
  defaultTheme = "cozy",
  children,
}: {
  defaultTheme?: string;
  children: React.ReactNode;
}) {
  const initial = (defaultTheme as Theme) ?? "cozy";
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return initial;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? initial;
  });

  useEffect(() => {
    applyThemeToDom(theme);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, next);
      applyThemeToDom(next);
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return ctx;
}
