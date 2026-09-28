"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

function resolvedTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Switches between light and dark. The choice is stored in a cookie so the
 * server renders the right theme on the next request (no flash).
 */
export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(resolvedTheme());
  }, []);

  const toggle = () => {
    const next: Theme = resolvedTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
    setTheme(next);
  };

  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={withLabel ? undefined : label}
      title={label}
      className={cn(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-sm text-ink-2 transition-colors duration-(--duration-fast) hover:bg-muted hover:text-ink",
        className,
      )}
    >
      <Icon icon={theme === "dark" ? Sun : Moon} size={18} />
      {withLabel ? <span className="text-sm">{theme === "dark" ? "Light theme" : "Dark theme"}</span> : null}
    </button>
  );
}
