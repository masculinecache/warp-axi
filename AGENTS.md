# warp-axi

Agent-ergonomic TOON wrapper for Cloudflare WARP CLI (`warp-cli`).

## GitHub credentials

All GitHub operations on this repo use the **masculinecache** account, never ambient/phillias credentials.
The `.mise.toml` sets `GH_REPO` and `GH_CONFIG_DIR` so any mise-driven shell routes `gh` automatically.
On a 403 or wrong-account auth failure: **stop and report blocked**. Never retry with different credentials.

Five-layer identity: repo-local mise env guard, git includeIf routing, credential helper, PATH gh router, npm OIDC trusted publishing.
See `~/.agents/skills/masculinecache-repo-identity/SKILL.md` for full details.

## npm publish

- Scoped `@masculinecache/warp-axi`
- Published via npm Trusted Publishing with OIDC provenance (no PAT/secret)
- Validate after publish: `npm dist-tag ls @masculinecache/warp-axi`
- Never print tokens

## Git commit identity

`<model>@<hostname -s>` — see global AGENTS.md for resolution.

## Build & test

```bash
npm run build   # tsc
npm test        # vitest run
npm run dev     # tsx bin/warp-axi.ts
```
