"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

function resolvedTheme(): Theme {
  const explicit = document.documentElement.dataset.theme;
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const observer = new MutationObserver(onChange);
  media.addEventListener("change", onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => {
    media.removeEventListener("change", onChange);
    observer.disconnect();
  };
}

/**
 * Switches between light and dark. The choice is stored in a cookie so the
 * server renders the right theme on the next request (no flash).
 */
export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string;
  withLabel?: boolean;
}) {
  // The server cannot know the system theme, so it renders the neutral state.
  const theme = useSyncExternalStore<Theme | null>(subscribe, resolvedTheme, () => null);

  const toggle = () => {
    const next: Theme = resolvedTheme() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
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
      {withLabel ? (
        <span className="text-sm">{theme === "dark" ? "Light theme" : "Dark theme"}</span>
      ) : null}
    </button>
  );
}
