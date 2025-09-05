"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({ theme: "system", setTheme: () => {} });

export function ThemeProvider({ attribute = "class", defaultTheme = "system", enableSystem = true, disableTransitionOnChange = true, children }) {
  const [theme, setTheme] = useState(defaultTheme);

  // hydrate from storage or system
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("theme");
      if (stored) setTheme(stored);
      else setTheme(defaultTheme);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // apply theme to document
  useEffect(() => {
    const root = document.documentElement;

    const apply = (next) => {
      if (attribute === "class") {
        root.classList.remove("light", "dark");
        if (next === "system") {
          const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
          root.classList.add(prefersDark ? "dark" : "light");
        } else {
          root.classList.add(next);
        }
      } else {
        root.setAttribute(attribute, next);
      }
    };

    const prev = disableTransitionOnChange ? disableTransitions() : null;
    apply(theme);
    if (prev) prev();
  }, [theme, attribute, disableTransitionOnChange]);

  // react to system changes when theme is system
  useEffect(() => {
    if (!enableSystem) return;
    if (theme !== "system") return;
    const m = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const prev = disableTransitionOnChange ? disableTransitions() : null;
      const root = document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(m.matches ? "dark" : "light");
      if (prev) prev();
    };
    try { m.addEventListener("change", handler); } catch { m.addListener(handler); }
    return () => {
      try { m.removeEventListener("change", handler); } catch { m.removeListener(handler); }
    };
  }, [theme, enableSystem, disableTransitionOnChange]);

  const api = useMemo(() => ({
    theme,
    setTheme: (next) => {
      try { window.localStorage.setItem("theme", next); } catch {}
      setTheme(next);
    }
  }), [theme]);

  return (
    <ThemeContext.Provider value={api}>{children}</ThemeContext.Provider>
  );
}

function disableTransitions() {
  const css = document.createElement("style");
  css.appendChild(document.createTextNode("*{transition:none!important}"));
  document.head.appendChild(css);
  return () => {
    // Force a reflow, flushing the CSS changes
    void window.getComputedStyle(css).opacity;
    css.parentNode && css.parentNode.removeChild(css);
  };
}

export function useTheme() {
  return useContext(ThemeContext);
}
