# @masculinecache/warp-axi

Agent-ergonomic TOON wrapper for the Cloudflare WARP CLI (`warp-cli`).

## Install

```bash
npm install -g @masculinecache/warp-axi
```

## Usage

```bash
warp-axi status                    # Connection status
warp-axi status --detail           # Detailed status with account info
warp-axi connect                   # Connect to WARP
warp-axi disconnect                # Disconnect from WARP
warp-axi registration show         # Show registration state
warp-axi registration new --org X  # Register with organization
warp-axi tunnel dump               # Split tunnel routes
warp-axi tunnel stats              # Tunnel statistics
warp-axi settings                  # Client settings
warp-axi debug network             # Network diagnostics
warp-axi vnet list                 # Virtual networks
warp-axi target list               # Infrastructure targets
```

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error |
| 2 | WARP not installed |

## MDM headless enrollment

```bash
warp-axi registration new --org <team> --token <service-token>
```

Service tokens are created in Zero Trust → Settings → Devices → Service Tokens.

## License

MIT
