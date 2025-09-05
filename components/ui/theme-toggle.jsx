"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme } = useTheme();
  const [resolved, setResolved] = useState("light");

  useEffect(() => {
    // Resolve current theme including 'system'
    const get = () => {
      if (theme === "system") {
        if (typeof window !== "undefined" && window.matchMedia) {
          return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
        }
        return "light";
      }
      return theme;
    };
    setResolved(get());
    if (typeof window !== "undefined" && theme === "system") {
      const m = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => setResolved(m.matches ? "dark" : "light");
      try { m.addEventListener("change", handler); } catch { m.addListener(handler); }
      return () => { try { m.removeEventListener("change", handler); } catch { m.removeListener(handler); } };
    }
  }, [theme]);

  const toggle = () => {
    const next = resolved === "dark" ? "light" : "dark";
    setTheme(next);
  };

  return (
    <Button variant="outline" size="icon" aria-label="Toggle theme" onClick={toggle} className={className}>
      {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
