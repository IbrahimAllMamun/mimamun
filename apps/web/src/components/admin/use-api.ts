"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiErrorBody } from "@portfolio/shared";
import { apiRequest, type ClientResult } from "@/lib/api/client";

interface QueryState<T, M> {
  data: T | null;
  meta: M | null;
  error: ApiErrorBody | null;
  status: number | null;
  /** True while the current path has not answered yet (previous data stays visible). */
  loading: boolean;
  reload: () => void;
}

/**
 * GET a JSON endpoint and keep the latest answer. Changing `path` (a filter,
 * a page) keeps the previous data on screen until the new answer arrives, so
 * lists do not flash empty. Pass `null` to skip the request.
 */
export function useApiQuery<T, M = unknown>(path: string | null): QueryState<T, M> {
  const [version, setVersion] = useState(0);
  const key = path ? `${version}:${path}` : null;
  const [result, setResult] = useState<{ key: string; value: ClientResult<T, M> } | null>(null);

  useEffect(() => {
    if (!key || !path) return;
    let active = true;
    void apiRequest<T, M>("GET", path).then((value) => {
      if (active) setResult({ key, value });
    });
    return () => {
      active = false;
    };
  }, [key, path]);

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const value = result?.value ?? null;
  return {
    data: value?.ok ? value.data : null,
    meta: value?.ok ? value.meta : null,
    error: value && !value.ok ? value.error : null,
    status: value ? (value.ok ? 200 : value.status) : null,
    loading: key !== null && result?.key !== key,
    reload,
  };
}

/** Builds a query string, skipping empty values. */
export function withQuery(path: string, params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `${path}?${text}` : path;
}
