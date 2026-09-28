"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import type { Permission, SessionDTO } from "@portfolio/shared";
import { setCsrfToken } from "@/lib/api/client";

const SessionContext = createContext<SessionDTO | null>(null);

/**
 * Makes the server-verified session available to admin components. The CSRF
 * token is handed to the request helper before children render, so their
 * first requests already carry it. Permissions here only shape the interface;
 * the API authorises every request on its own.
 */
export function SessionProvider({
  session,
  children,
}: {
  session: SessionDTO;
  children: ReactNode;
}) {
  setCsrfToken(session.csrfToken);
  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession(): SessionDTO {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside <SessionProvider>");
  return session;
}

export function useCan(): (permission: Permission) => boolean {
  const session = useSession();
  return useCallback(
    (permission: Permission) => session.user.permissions.includes(permission),
    [session],
  );
}
