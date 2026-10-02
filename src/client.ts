// ---------------------------------------------------------------------------
// FlareSolverr HTTP client
// ---------------------------------------------------------------------------

export interface FlareSolverrResponse<T = unknown> {
  solution: T;
  status: string;
  message: string;
  startTimestamp: number;
  endTimestamp: number;
  version: string;
}

/** Response shape for session management commands (no `solution` wrapper) */
export interface FlareSolverrSessionResponse {
  status: string;
  message: string;
  session?: string;
  sessions?: string[];
  startTimestamp: number;
  endTimestamp: number;
  version: string;
}

export interface GetResponse {
  url: string;
  status: number;
  headers: Record<string, string>;
  response: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    size: number;
    httpOnly: boolean;
    secure: boolean;
    session: boolean;
    sameSite: string;
  }>;
  userAgent: string;
  turnstile_token?: string;
  [key: string]: unknown;
}

export interface SessionListResponse {
  sessions: string[];
}

export interface SessionCreateResponse {
  session: string;
}

export interface SessionDestroyResponse {
  success: boolean;
}

export interface FlareSolverrConfig {
  baseUrl: string;
}

export interface ProxyConfig {
  url: string;
  username?: string;
  password?: string;
}

export interface CookieConfig {
  name: string;
  value: string;
}

export interface RequestGetParams {
  url: string;
  session?: string;
  session_ttl_minutes?: number;
  maxTimeout?: number;
  cookies?: CookieConfig[];
  returnOnlyCookies?: boolean;
  returnScreenshot?: boolean;
  proxy?: ProxyConfig;
  waitInSeconds?: number;
  disableMedia?: boolean;
  tabs_till_verify?: number;
  [key: string]: unknown;
}

export interface RequestPostParams extends RequestGetParams {
  postData: string;
}

export interface SessionCreateParams {
  session?: string;
  proxy?: ProxyConfig;
  [key: string]: unknown;
}

export interface SessionDestroyParams {
  session: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function getConfig(): FlareSolverrConfig {
  const url = process.env.FLARESOLVERR_URL;
  if (!url) {
    throw new Error(
      "FLARESOLVERR_URL environment variable is required. " +
        "Set it in your MCP client configuration under env.FLARESOLVERR_URL."
    );
  }
  const baseUrl = url.replace(/\/+$/, "");
  return { baseUrl };
}

// ---------------------------------------------------------------------------
// HTTP client
// ---------------------------------------------------------------------------

export async function callFlareSolverr<T>(
  command: string,
  params: Record<string, unknown>,
  config: FlareSolverrConfig
): Promise<FlareSolverrResponse<T>> {
  const body = { cmd: command, ...params };

  const response = await fetch(`${config.baseUrl}/v1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: FlareSolverrResponse<T> = await response.json();

  if (data.status !== "ok") {
    throw new Error(`FlareSolverr error: ${data.message || data.status}`);
  }

  return data;
}

/**
 * Call FlareSolverr for session management commands.
 * These commands return data directly at the root level (no `solution` wrapper).
 */
async function callFlareSolverrSession(
  command: string,
  params: Record<string, unknown>,
  config: FlareSolverrConfig
): Promise<FlareSolverrSessionResponse> {
  const body = { cmd: command, ...params };

  const response = await fetch(`${config.baseUrl}/v1`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data: FlareSolverrSessionResponse = await response.json();

  if (data.status !== "ok") {
    throw new Error(`FlareSolverr error: ${data.message || data.status}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// High-level API functions
// ---------------------------------------------------------------------------

export async function requestGet(
  params: RequestGetParams,
  config?: FlareSolverrConfig
): Promise<GetResponse> {
  const c = config ?? getConfig();
  const { solution } = await callFlareSolverr<GetResponse>(
    "request.get",
    params,
    c
  );
  return solution;
}

export async function requestPost(
  params: RequestPostParams,
  config?: FlareSolverrConfig
): Promise<GetResponse> {
  const c = config ?? getConfig();
  const { solution } = await callFlareSolverr<GetResponse>(
    "request.post",
    params,
    c
  );
  return solution;
}

export async function sessionCreate(
  params: SessionCreateParams,
  config?: FlareSolverrConfig
): Promise<string> {
  const c = config ?? getConfig();
  const data = await callFlareSolverrSession("sessions.create", params, c);
  if (!data.session) {
    throw new Error(
      `FlareSolverr session.create returned no session ID. Response: ${JSON.stringify(data)}`
    );
  }
  return data.session;
}

export async function sessionDestroy(
  params: SessionDestroyParams,
  config?: FlareSolverrConfig
): Promise<boolean> {
  const c = config ?? getConfig();
  const data = await callFlareSolverrSession("sessions.destroy", params, c);
  return data.message !== undefined;
}

export async function sessionList(
  config?: FlareSolverrConfig
): Promise<string[]> {
  const c = config ?? getConfig();
  const data = await callFlareSolverrSession("sessions.list", {}, c);
  return data.sessions ?? [];
}
