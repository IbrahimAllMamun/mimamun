/**
 * Thin GitHub REST client. Only public repository metadata is read. Every call
 * has a timeout; callers treat failures as "keep the cached data".
 */
export interface GithubRepositoryPayload {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  pushed_at: string | null;
}

export interface GithubClient {
  listRepositories(username: string): Promise<GithubRepositoryPayload[]>;
  getLanguages(fullName: string): Promise<Record<string, number>>;
}

export class GithubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number | null,
  ) {
    super(message);
    this.name = "GithubApiError";
  }
}

export class HttpGithubClient implements GithubClient {
  constructor(
    private readonly apiUrl: string,
    private readonly token: string | null,
    private readonly timeoutMs = 10_000,
  ) {}

  private async request<T>(path: string): Promise<T> {
    const headers: Record<string, string> = {
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "portfolio-github-sync",
    };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl}${path}`, {
        headers,
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error) {
      throw new GithubApiError(`GitHub request failed: ${(error as Error).message}`, null);
    }
    if (!response.ok) {
      const remaining = response.headers.get("x-ratelimit-remaining");
      const reason = remaining === "0" ? "rate limit exceeded" : `HTTP ${response.status}`;
      throw new GithubApiError(`GitHub request failed: ${reason}`, response.status);
    }
    return (await response.json()) as T;
  }

  listRepositories(username: string): Promise<GithubRepositoryPayload[]> {
    const user = encodeURIComponent(username);
    return this.request<GithubRepositoryPayload[]>(
      `/users/${user}/repos?per_page=100&type=owner&sort=pushed`,
    );
  }

  getLanguages(fullName: string): Promise<Record<string, number>> {
    const [owner, repo] = fullName.split("/");
    return this.request<Record<string, number>>(
      `/repos/${encodeURIComponent(owner ?? "")}/${encodeURIComponent(repo ?? "")}/languages`,
    );
  }
}
