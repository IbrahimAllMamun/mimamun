"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ExternalLink, LogOut, Menu, UserRound, X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { SessionDTO } from "@portfolio/shared";
import { Icon } from "@/components/ui/icon";
import { apiRequest } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { CommandSearch } from "./command-search";
import { ConfirmProvider } from "./dialog";
import { isActiveAdminPath, NAV_GROUPS } from "./navigation";
import { SessionProvider, useCan, useSession } from "./session";
import { ToastProvider } from "./toast";
import { UnsavedChangesProvider, useUnsavedChanges } from "./unsaved";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const can = useCan();
  return (
    <nav aria-label="Admin" className="space-y-6">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => can(item.permission));
        if (items.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="label px-3 pb-1.5">{group.label}</p>
            <ul>
              {items.map((item) => {
                const active = isActiveAdminPath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-9 items-center gap-2.5 rounded-sm px-3 text-sm transition-colors duration-(--duration-fast)",
                        active
                          ? "bg-primary-tint font-medium text-ink"
                          : "text-ink-2 hover:bg-muted hover:text-ink",
                      )}
                    >
                      <Icon
                        icon={item.icon}
                        size={16}
                        className={active ? "text-primary" : "text-ink-3"}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <Link href="/admin" className="flex items-baseline gap-2 px-3">
      <span className="font-serif text-lg text-ink">All-Mamun</span>
      <span className="label">Admin</span>
    </Link>
  );
}

function UserMenu() {
  const session = useSession();
  const router = useRouter();
  const { confirmLeave } = useUnsavedChanges();
  const signOut = async () => {
    if (!(await confirmLeave())) return;
    await apiRequest("POST", "/api/auth/logout");
    router.replace("/admin/login");
    router.refresh();
  };
  return (
    <>
      <button
        type="button"
        popoverTarget="admin-user-menu"
        className="inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm text-ink hover:bg-muted"
      >
        <span className="grid size-7 place-items-center rounded-full bg-secondary-tint font-medium text-secondary">
          {session.user.name.charAt(0).toUpperCase()}
        </span>
        <span className="hidden text-left leading-tight md:block">
          <span className="block">{session.user.name}</span>
          <span className="block text-xs text-ink-3">{session.user.role.name}</span>
        </span>
      </button>
      <div
        id="admin-user-menu"
        popover="auto"
        className="inset-auto top-14 right-4 m-0 w-60 rounded-sm border border-rule bg-elevated p-1 text-sm text-ink shadow-popover"
      >
        <p className="border-b border-rule px-3 py-2 text-xs text-ink-3">{session.user.email}</p>
        <Link
          href="/admin/account"
          className="flex min-h-9 items-center gap-2 rounded-xs px-3 hover:bg-muted"
        >
          <Icon icon={UserRound} size={15} /> Account and password
        </Link>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-9 items-center gap-2 rounded-xs px-3 hover:bg-muted"
        >
          <Icon icon={ExternalLink} size={15} /> View site
        </a>
        <button
          type="button"
          onClick={signOut}
          className="flex min-h-9 w-full items-center gap-2 rounded-xs px-3 text-left hover:bg-muted"
        >
          <Icon icon={LogOut} size={15} /> Sign out
        </button>
      </div>
    </>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    drawer.current?.close();
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-paper lg:grid lg:grid-cols-(--admin-columns)">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-sm bg-ink px-4 py-3 text-paper focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 overflow-y-auto border-r border-rule bg-surface py-5 lg:flex">
        <Brand />
        <div className="flex-1 px-2">
          <SidebarNav />
        </div>
      </aside>

      <dialog
        ref={drawer}
        aria-label="Admin navigation"
        className="mobile-sheet m-0 h-dvh max-h-none w-72 max-w-full bg-surface p-0 text-ink backdrop:bg-scrim"
        onClick={(event) => {
          if (event.target === drawer.current) drawer.current?.close();
        }}
      >
        <div className="flex items-center justify-between border-b border-rule py-3 pr-2">
          <Brand />
          <button
            type="button"
            onClick={() => drawer.current?.close()}
            className="rounded-sm p-2 text-ink-3 hover:bg-muted"
            aria-label="Close navigation"
          >
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="px-2 py-4">
          <SidebarNav onNavigate={() => drawer.current?.close()} />
        </div>
      </dialog>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-rule bg-paper/95 px-4 backdrop-blur-sm sm:px-6">
          <button
            type="button"
            onClick={() => drawer.current?.showModal()}
            className="inline-flex min-h-10 items-center gap-2 rounded-sm px-2 text-sm hover:bg-muted lg:hidden"
            aria-haspopup="dialog"
          >
            <Icon icon={Menu} size={18} />
            <span className="sr-only sm:not-sr-only">Menu</span>
          </button>
          <div className="flex flex-1 justify-center lg:justify-start">
            <CommandSearch />
          </div>
          <UserMenu />
        </header>
        <main
          id="admin-main"
          tabIndex={-1}
          className="flex-1 px-4 py-6 focus:outline-none sm:px-6 lg:px-10 lg:py-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}

/** The signed-in admin frame: providers, sidebar navigation, search and user menu. */
export function AdminShell({ session, children }: { session: SessionDTO; children: ReactNode }) {
  return (
    <SessionProvider session={session}>
      <ToastProvider>
        <ConfirmProvider>
          <UnsavedChangesProvider>
            <Shell>{children}</Shell>
          </UnsavedChangesProvider>
        </ConfirmProvider>
      </ToastProvider>
    </SessionProvider>
  );
}
