import type { Logger } from "../lib/logger";

/**
 * Tells the Next.js server that content changed so cached pages refresh
 * immediately. Calls are debounced and best-effort: if the web app is
 * unreachable, time-based revalidation still refreshes content within minutes.
 */
export interface Revalidator {
  contentChanged(reason: string): void;
  flush(): Promise<void>;
}

export class HttpRevalidator implements Revalidator {
  private timer: NodeJS.Timeout | null = null;
  private reasons = new Set<string>();
  private inFlight: Promise<void> | null = null;

  constructor(
    private readonly url: string,
    private readonly secret: string,
    private readonly logger: Logger,
    private readonly delayMs = 300,
  ) {}

  contentChanged(reason: string): void {
    this.reasons.add(reason);
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.delayMs);
    this.timer.unref();
  }

  async flush(): Promise<void> {
    if (this.inFlight) await this.inFlight;
    if (this.reasons.size === 0) return;
    const reasons = [...this.reasons];
    this.reasons.clear();
    this.inFlight = (async () => {
      try {
        const response = await fetch(`${this.url.replace(/\/$/, "")}/internal/revalidate`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-revalidate-secret": this.secret },
          body: JSON.stringify({ tags: ["content"], reasons }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) this.logger.warn({ status: response.status }, "web revalidation rejected");
      } catch (error) {
        this.logger.warn({ err: error }, "web revalidation failed; relying on time-based refresh");
      } finally {
        this.inFlight = null;
      }
    })();
    await this.inFlight;
  }
}

export class NoopRevalidator implements Revalidator {
  readonly calls: string[] = [];
  contentChanged(reason: string): void {
    this.calls.push(reason);
  }
  async flush(): Promise<void> {}
}
