"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Icon } from "./icon";

/** Copies text to the clipboard and announces the result to screen readers. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
    setTimeout(() => setState("idle"), 2000);
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-2 text-sm text-primary transition-colors hover:bg-primary-tint"
    >
      <Icon icon={state === "copied" ? Check : Copy} size={15} />
      <span>{state === "copied" ? "Copied" : label}</span>
      <span aria-live="polite" className="sr-only">
        {state === "copied"
          ? "Copied to clipboard"
          : state === "failed"
            ? "Copy failed; select the text manually"
            : ""}
      </span>
    </button>
  );
}
