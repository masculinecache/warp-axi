---
name: warp-axi
description: Manage Cloudflare WARP client (warp-cli) through an agent-ergonomic TOON wrapper. Use when checking WARP connection status, registering/enrolling devices, managing split tunnel routes, virtual networks, infrastructure targets, or running network diagnostics on fleet nodes with WARP installed.
---

# warp-axi

Agent-ergonomic wrapper for the Cloudflare WARP CLI (`warp-cli`).

## Invocation

```bash
warp-axi <area> [subcommand] [flags]
# or via npx:
npx @masculinecache/warp-axi <area> [subcommand] [flags]
```

## Areas

| Area | Subcommands | Description |
|------|-------------|-------------|
| `status` | (none), `--detail`, `--json` | Connection status and account info |
| `connect` | (none) | Connect to WARP |
| `disconnect` | (none) | Disconnect from WARP |
| `registration` | `show`, `new [--org <org>] [--token <token>]`, `delete` | Device registration management |
| `tunnel` | `dump`, `stats` | Split tunnel routes and tunnel statistics |
| `settings` | (none) | Client settings display |
| `debug` | `network`, `posture`, `connectivity-check` | Diagnostics |
| `vnet` | `list`, `add <name>`, `remove <name>` | Virtual network management |
| `target` | `list` | Infrastructure target listing |

## Global flags

- `--help`, `-h` — Show help
- `--version`, `-V` — Show version

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | WARP not installed |

## Error codes

| Code | When |
|------|------|
| `WARP_NOT_INSTALLED` | `warp-cli` binary not found on PATH |
| `REGISTRATION_FAILED` | Registration attempt failed |
| `NOT_REGISTERED` | Device not registered with organization |
| `ALREADY_REGISTERED` | Device already registered |
| `CONNECTION_FAILED` | Could not establish WARP connection |
| `AUTH_FAILED` | Authentication failed |
| `DAEMON_NOT_RUNNING` | warp-svc daemon not running |
| `PERMISSION_DENIED` | Insufficient permissions |

## Installation

```bash
npm install -g @masculinecache/warp-axi
# or use without installing:
npx @masculinecache/warp-axi status
```

## MDM headless enrollment

For zero-touch fleet enrollment, use the service token flow:

```bash
warp-axi registration new --org <team-name> --token <service-token>
```

The service token is obtained from the Zero Trust dashboard under Settings → Devices → Service Tokens.
