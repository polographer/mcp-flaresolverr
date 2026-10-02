# mcp-flaresolverr

A Node MCP (Model Context Protocol) server that exposes [FlareSolverr](https://github.com/FlareSolverr/FlareSolverr)'s anti-bot bypass capabilities — Cloudflare and DDoS-GUARD protection — to any MCP client.

## Installation

```sh
npx mcp-flaresolverr
```

Or install globally:

```sh
npm install -g mcp-flaresolverr
```

## Usage

Configure the server in your MCP client config and point it at your FlareSolverr instance:

```jsonc
{
  "mcp": {
    "servers": {
      "flaresolverr": {
        "command": "npx",
        "args": ["-y", "mcp-flaresolverr"],
        "env": {
          "FLARESOLVERR_URL": "http://localhost:8191"
        }
      }
    }
  }
}
```

## Tools

| Tool | Description |
|------|-------------|
| `flare_get` | HTTP GET through FlareSolverr — returns page content, cookies, headers |
| `flare_post` | HTTP POST through FlareSolverr — for form submissions and API calls |
| `flare_session_create` | Create a persistent browser session for faster subsequent requests |
| `flare_session_destroy` | Destroy a session and free resources |
| `flare_session_list` | List all active browser sessions |

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `FLARESOLVERR_URL` | Yes | Base URL of your FlareSolverr instance (e.g. `http://localhost:8191`) |

## Development

```sh
npm install
npm run build
npm test
```

## License

MIT
