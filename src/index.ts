#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  requestGet,
  requestPost,
  sessionCreate,
  sessionDestroy,
  sessionList,
} from "./client.js";

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "mcp-flaresolverr",
  version: "1.0.0",
});

// --- request.get ---
server.registerTool(
  "flare_get",
  {
    description:
      "Make an HTTP GET request through FlareSolverr to bypass Cloudflare/DDoS protection. " +
      "Returns the page content, cookies, and headers after the challenge is solved.",
    inputSchema: {
      url: z.string().url(),
      session: z.string().optional().describe(
        "Session ID to reuse a persistent browser instance"
      ),
      session_ttl_minutes: z
        .number()
        .optional()
        .describe(
          "Auto-rotate session after this many minutes"
        ),
      maxTimeout: z
        .number()
        .optional()
        .describe(
          "Max time in milliseconds to wait for the challenge to solve (default: 60000)"
        ),
      cookies: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional()
        .describe(
          "Cookies to send with the request, e.g. [{\"name\":\"cookie1\",\"value\":\"value1\"}]"
        ),
      returnOnlyCookies: z
        .boolean()
        .optional()
        .describe(
          "If true, only return cookies instead of full page response"
        ),
      returnScreenshot: z
        .boolean()
        .optional()
        .describe(
          "If true, capture a screenshot of the solved page (Base64 PNG)"
        ),
      proxy: z
        .object({
          url: z.string(),
          username: z.string().optional(),
          password: z.string().optional(),
        })
        .optional()
        .describe(
          "Proxy configuration, e.g. {\"url\":\"http://127.0.0.1:8888\"}"
        ),
      waitInSeconds: z
        .number()
        .optional()
        .describe(
          "Seconds to wait after solving the challenge before returning (for dynamic content)"
        ),
      disableMedia: z
        .boolean()
        .optional()
        .describe(
          "If true, prevent loading images, CSS, and fonts to speed up navigation"
        ),
      tabs_till_verify: z
        .number()
        .optional()
        .describe(
          "Number of Tab presses to reach a Turnstile captcha for manual verification"
        ),
    },
  },
  async (input) => {
    const result = await requestGet(input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- request.post ---
server.registerTool(
  "flare_post",
  {
    description:
      "Make an HTTP POST request through FlareSolverr to bypass Cloudflare/DDoS protection. " +
      "Useful for submitting forms or API calls behind protection.",
    inputSchema: {
      url: z.string().url(),
      postData: z.string().describe(
        "POST body data in application/x-www-form-urlencoded format, e.g. 'a=b&c=d'"
      ),
      session: z.string().optional().describe(
        "Session ID to reuse a persistent browser instance"
      ),
      session_ttl_minutes: z
        .number()
        .optional()
        .describe(
          "Auto-rotate session after this many minutes"
        ),
      maxTimeout: z
        .number()
        .optional()
        .describe(
          "Max time in milliseconds to wait for the challenge to solve (default: 60000)"
        ),
      cookies: z
        .array(
          z.object({
            name: z.string(),
            value: z.string(),
          })
        )
        .optional()
        .describe(
          "Cookies to send with the request"
        ),
      returnOnlyCookies: z
        .boolean()
        .optional()
        .describe(
          "If true, only return cookies instead of full page response"
        ),
      proxy: z
        .object({
          url: z.string(),
          username: z.string().optional(),
          password: z.string().optional(),
        })
        .optional()
        .describe(
          "Proxy configuration"
        ),
    },
  },
  async (input) => {
    const result = await requestPost(input);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// --- sessions.create ---
server.registerTool(
  "flare_session_create",
  {
    description:
      "Create a persistent browser session. This speeds up subsequent requests " +
      "since the browser doesn't need to launch a new instance for every request.",
    inputSchema: {
      session: z
        .string()
        .optional()
        .describe(
          "Custom session ID. If not provided, a random UUID will be generated"
        ),
      proxy: z
        .object({
          url: z.string(),
          username: z.string().optional(),
          password: z.string().optional(),
        })
        .optional()
        .describe(
          "Proxy configuration for this session"
        ),
    },
  },
  async (input) => {
    const sessionId = await sessionCreate(input);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ session: sessionId }, null, 2),
        },
      ],
    };
  }
);

// --- sessions.destroy ---
server.registerTool(
  "flare_session_destroy",
  {
    description:
      "Destroy a browser session and free up resources. Always close sessions when done.",
    inputSchema: {
      session: z.string().describe("Session ID to destroy"),
    },
  },
  async (input) => {
    const success = await sessionDestroy(input);
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({ success }, null, 2),
        },
      ],
    };
  }
);

// --- sessions.list ---
server.registerTool(
  "flare_session_list",
  {
    description:
      "List all active browser sessions. Useful for debugging and monitoring.",
    inputSchema: {},
  },
  async () => {
    const sessions = await sessionList();
    return {
      content: [{ type: "text", text: JSON.stringify({ sessions }, null, 2) }],
    };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
