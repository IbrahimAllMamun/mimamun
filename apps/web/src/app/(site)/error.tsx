"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

/**
 * Error boundary for public pages. The API layer already turns outages into
 * "unavailable" notices, so this only catches unexpected rendering errors.
 */
export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-page section-space">
      <div className="grid-editorial gap-y-6">
        <p className="label col-span-4 sm:col-span-8 lg:col-span-3">Something went wrong</p>
        <div className="col-span-4 space-y-6 sm:col-span-8 lg:col-span-9">
          <h1 className="display text-4xl text-ink">This page could not be displayed.</h1>
          <p className="max-w-measure text-lg text-ink-2">
            An unexpected error occurred. Try again; if it keeps happening, the problem has been logged
            {error.digest ? (
              <>
                {" "}
                with reference <code className="font-mono text-sm">{error.digest}</code>
              </>
            ) : null}
            .
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={reset}>
              <Icon icon={RotateCw} size={16} /> Try again
            </Button>
            <ButtonLink href="/" variant="secondary">
              Home
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
