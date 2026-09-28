"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { useConfirm } from "./dialog";

interface UnsavedApi {
  /** Marks an editor (by key) as having unsaved changes, or clears it. */
  setDirty: (key: string, dirty: boolean) => void;
  /** Resolves true when it is safe to leave (nothing unsaved, or the user agreed). */
  confirmLeave: () => Promise<boolean>;
}

const UnsavedContext = createContext<UnsavedApi | null>(null);

/**
 * Protects unsaved edits: closing the tab triggers the browser's prompt, and
 * following an in-app link asks for confirmation first.
 */
export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const dirty = useRef(new Set<string>());
  const confirm = useConfirm();
  const router = useRouter();

  const confirmLeave = useCallback(async () => {
    if (dirty.current.size === 0) return true;
    const ok = await confirm({
      title: "Leave without saving?",
      body: "You have changes that have not been saved. They will be lost if you leave this page.",
      confirmLabel: "Leave page",
      tone: "danger",
    });
    if (ok) dirty.current.clear();
    return ok;
  }, [confirm]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) event.preventDefault();
    };
    const onClick = (event: MouseEvent) => {
      if (dirty.current.size === 0 || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (
        !(anchor instanceof HTMLAnchorElement) ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      )
        return;
      const url = new URL(anchor.href, window.location.href);
      if (
        url.origin !== window.location.origin ||
        (url.pathname === window.location.pathname && url.hash)
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      void confirmLeave().then((ok) => {
        if (ok) router.push(`${url.pathname}${url.search}${url.hash}`);
      });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [confirmLeave, router]);

  const api = useMemo<UnsavedApi>(
    () => ({
      setDirty: (key, value) => {
        if (value) dirty.current.add(key);
        else dirty.current.delete(key);
      },
      confirmLeave,
    }),
    [confirmLeave],
  );
  return <UnsavedContext value={api}>{children}</UnsavedContext>;
}

export function useUnsavedChanges(): UnsavedApi {
  const api = useContext(UnsavedContext);
  if (!api) throw new Error("useUnsavedChanges must be used inside <UnsavedChangesProvider>");
  return api;
}
