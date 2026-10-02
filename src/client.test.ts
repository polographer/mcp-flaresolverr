import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConfig,
  callFlareSolverr,
  requestGet,
  requestPost,
  sessionCreate,
  sessionDestroy,
  sessionList,
  type FlareSolverrConfig,
  type GetResponse,
} from "./client.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TEST_URL = "http://localhost:8191";
const defaultEnv = { FLARESOLVERR_URL: TEST_URL };

function mockResponse(
  body: Record<string, unknown>,
  status = "ok",
  message = ""
) {
  return {
    status: 200,
    json: async () => ({
      solution: body,
      status,
      message,
      startTimestamp: Date.now(),
      endTimestamp: Date.now() + 100,
      version: "1.0.0",
    }),
  };
}

/** For session management commands — no `solution` wrapper */
function mockSessionResponse(
  body: Record<string, unknown>,
  status = "ok",
  message = ""
) {
  return {
    status: 200,
    json: async () => ({
      ...body,
      status,
      message,
      startTimestamp: Date.now(),
      endTimestamp: Date.now() + 100,
      version: "1.0.0",
    }),
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  process.env = { ...defaultEnv };
});

// ---------------------------------------------------------------------------
// getConfig
// ---------------------------------------------------------------------------

describe("getConfig", () => {
  it("throws when FLARESOLVERR_URL is not set", () => {
    delete process.env.FLARESOLVERR_URL;
    expect(() => getConfig()).toThrow(
      "FLARESOLVERR_URL environment variable is required"
    );
  });

  it("strips trailing slashes from the URL", () => {
    process.env.FLARESOLVERR_URL = "http://localhost:8191///";
    const config = getConfig();
    expect(config.baseUrl).toBe("http://localhost:8191");
  });

  it("returns baseUrl without modifying the original env", () => {
    process.env.FLARESOLVERR_URL = "http://localhost:8191";
    const config = getConfig();
    expect(config.baseUrl).toBe("http://localhost:8191");
  });
});

// ---------------------------------------------------------------------------
// callFlareSolverr
// ---------------------------------------------------------------------------

describe("callFlareSolverr", () => {
  it("sends POST to the correct endpoint", async () => {
    const fetch = vi.fn().mockResolvedValue(mockResponse({ result: true }));
    global.fetch = fetch as unknown as typeof fetch;

    const config: FlareSolverrConfig = { baseUrl: TEST_URL };
    await callFlareSolverr<{ result: boolean }>("test.cmd", { foo: "bar" }, config);

    expect(fetch).toHaveBeenCalledWith(
      `${TEST_URL}/v1`,
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
    );
  });

  it("includes command and params in the request body", async () => {
    const fetch = vi.fn().mockResolvedValue(mockResponse({ result: true }));
    global.fetch = fetch as unknown as typeof fetch;

    const config: FlareSolverrConfig = { baseUrl: TEST_URL };
    await callFlareSolverr<{ result: boolean }>("request.get", { url: "https://example.com" }, config);

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg).toEqual({
      cmd: "request.get",
      url: "https://example.com",
    });
  });

  it("throws on non-ok status", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockResponse({}, "error", "Challenge not solved")
    );
    global.fetch = fetch as unknown as typeof fetch;

    const config: FlareSolverrConfig = { baseUrl: TEST_URL };
    await expect(
      callFlareSolverr("request.get", { url: "https://example.com" }, config)
    ).rejects.toThrow("FlareSolverr error: Challenge not solved");
  });

  it("returns the solution field", async () => {
    const expected: GetResponse = {
      url: "https://example.com",
      status: 200,
      headers: { "content-type": "text/html" },
      response: "<html><body>Hello</body></html>",
      cookies: [
        { name: "session", value: "abc123", domain: ".example.com", path: "/", expires: 0, size: 10, httpOnly: false, secure: true, session: false, sameSite: "None" },
      ],
      userAgent: "Mozilla/5.0",
    };
    const fetch = vi.fn().mockResolvedValue(mockResponse(expected));
    global.fetch = fetch as unknown as typeof fetch;

    const config: FlareSolverrConfig = { baseUrl: TEST_URL };
    const result = await callFlareSolverr<GetResponse>("request.get", { url: "https://example.com" }, config);

    expect(result.solution).toEqual(expected);
  });
});

// ---------------------------------------------------------------------------
// requestGet
// ---------------------------------------------------------------------------

describe("requestGet", () => {
  it("calls FlareSolverr with request.get command", async () => {
    const expected: GetResponse = {
      url: "https://example.com",
      status: 200,
      headers: {},
      response: "<html></html>",
      cookies: [],
      userAgent: "TestAgent",
    };
    const fetch = vi.fn().mockResolvedValue(mockResponse(expected));
    global.fetch = fetch as unknown as typeof fetch;

    const result = await requestGet({ url: "https://example.com" });
    expect(result).toEqual(expected);
  });

  it("passes session parameter", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockResponse({ url: "x", status: 200, headers: {}, response: "", cookies: [], userAgent: "" })
    );
    global.fetch = fetch as unknown as typeof fetch;

    await requestGet({ url: "https://example.com", session: "my-session" });

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg.session).toBe("my-session");
  });

  it("passes cookies parameter", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockResponse({ url: "x", status: 200, headers: {}, response: "", cookies: [], userAgent: "" })
    );
    global.fetch = fetch as unknown as typeof fetch;

    await requestGet({
      url: "https://example.com",
      cookies: [{ name: "test", value: "123" }],
    });

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg.cookies).toEqual([{ name: "test", value: "123" }]);
  });

  it("passes all optional parameters", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockResponse({ url: "x", status: 200, headers: {}, response: "", cookies: [], userAgent: "" })
    );
    global.fetch = fetch as unknown as typeof fetch;

    await requestGet({
      url: "https://example.com",
      maxTimeout: 30000,
      returnOnlyCookies: true,
      returnScreenshot: true,
      waitInSeconds: 5,
      disableMedia: true,
      proxy: { url: "http://proxy:8080" },
    });

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg.maxTimeout).toBe(30000);
    expect(callArg.returnOnlyCookies).toBe(true);
    expect(callArg.returnScreenshot).toBe(true);
    expect(callArg.waitInSeconds).toBe(5);
    expect(callArg.disableMedia).toBe(true);
    expect(callArg.proxy).toEqual({ url: "http://proxy:8080" });
  });
});

// ---------------------------------------------------------------------------
// requestPost
// ---------------------------------------------------------------------------

describe("requestPost", () => {
  it("calls FlareSolverr with request.post command", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockResponse({ url: "x", status: 200, headers: {}, response: "", cookies: [], userAgent: "" })
    );
    global.fetch = fetch as unknown as typeof fetch;

    await requestPost({ url: "https://example.com", postData: "key=value" });

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg.cmd).toBe("request.post");
    expect(callArg.postData).toBe("key=value");
  });
});

// ---------------------------------------------------------------------------
// sessionCreate
// ---------------------------------------------------------------------------

describe("sessionCreate", () => {
  it("returns the session ID", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockSessionResponse({ session: "session-123" })
    );
    global.fetch = fetch as unknown as typeof fetch;

    const result = await sessionCreate({});
    expect(result).toBe("session-123");
  });

  it("passes custom session ID", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockSessionResponse({ session: "my-session" })
    );
    global.fetch = fetch as unknown as typeof fetch;

    await sessionCreate({ session: "my-session" });

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg.session).toBe("my-session");
  });

  it("passes proxy config", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockSessionResponse({ session: "session-1" })
    );
    global.fetch = fetch as unknown as typeof fetch;

    await sessionCreate({ proxy: { url: "http://proxy:8080", username: "u", password: "p" } });

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg.proxy).toEqual({ url: "http://proxy:8080", username: "u", password: "p" });
  });
});

// ---------------------------------------------------------------------------
// sessionDestroy
// ---------------------------------------------------------------------------

describe("sessionDestroy", () => {
  it("returns true on success", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockSessionResponse({ message: "The session has been removed." })
    );
    global.fetch = fetch as unknown as typeof fetch;

    const result = await sessionDestroy({ session: "my-session" });
    expect(result).toBe(true);
  });

  it("passes session ID", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockSessionResponse({ message: "The session has been removed." })
    );
    global.fetch = fetch as unknown as typeof fetch;

    await sessionDestroy({ session: "my-session" });

    const callArg = JSON.parse((fetch.mock.calls[0][1] as { body: string }).body);
    expect(callArg.session).toBe("my-session");
  });
});

// ---------------------------------------------------------------------------
// sessionList
// ---------------------------------------------------------------------------

describe("sessionList", () => {
  it("returns list of session IDs", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockSessionResponse({ sessions: ["session-1", "session-2", "session-3"] })
    );
    global.fetch = fetch as unknown as typeof fetch;

    const result = await sessionList();
    expect(result).toEqual(["session-1", "session-2", "session-3"]);
  });

  it("returns empty array when no sessions", async () => {
    const fetch = vi.fn().mockResolvedValue(
      mockSessionResponse({ sessions: [] })
    );
    global.fetch = fetch as unknown as typeof fetch;

    const result = await sessionList();
    expect(result).toEqual([]);
  });
});
