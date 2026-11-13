import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp, callWarpLenient } from "../warp.js";
import { takeBoolFlag } from "../args.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderList, renderHelp, renderOutput, field, custom, type Schema } from "../toon.js";
import { renderListBlock } from "../list.js";

const TUNNEL_SCHEMA: Schema = {
  cidr: custom((item: Record<string, unknown>) => {
    const cidr = item.cidr ?? item.address;
    return cidr ? String(cidr) : String(item.route ?? "unknown");
  }),
  description: field("description"),
  type: field("type"),
  via: field("via"),
};

const STATS_SCHEMA: Schema = {
  rx: field("rx"),
  tx: field("tx"),
};

const RAW_SCHEMA: Schema = {
  raw: field("raw"),
};

function parseTunnelDump(text: string): Record<string, unknown>[] {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) return data;
    if (data.routes) return data.routes;
    if (data.tunnels) return data.tunnels;
    return [data];
  } catch {
    const items: Record<string, unknown>[] = [];
    let current: Record<string, unknown> = {};
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(.+?):\s+(.+)$/);
      if (m) {
        current[m[1].trim().toLowerCase().replace(/\s+/g, "_")] = m[2].trim();
      } else if (line.trim() === "" && Object.keys(current).length > 0) {
        items.push(current);
        current = {};
      }
    }
    if (Object.keys(current).length > 0) items.push(current);
    return items;
  }
}

export const tunnelArea: CommandArea = {
  name: "tunnel",
  aliases: ["split-tunnel", "routes"],
  description: "Show split tunnel configuration and routes",
  help: [
    "usage: warp-axi tunnel <subcommand> [options]",
    "",
    "Subcommands:",
    "  dump        List all split tunnel routes",
    "  stats       Show tunnel traffic statistics",
    "",
    "Flags:",
    "  --json      Use warp-cli --json for structured output",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };

    const sub = args.shift();
    switch (sub) {
      case "dump":
        return tunnelDump(ctx, args);
      case "stats":
        return tunnelStats(ctx, args);
      default:
        return { stdout: renderHelp(this.help), exitCode: 0 };
    }
  },
};

async function tunnelDump(
  ctx: CommandContext,
  args: string[],
): Promise<{ stdout: string; exitCode: number }> {
  const useJson = takeBoolFlag(args, "--json");
  validateFlags(args, ["--json"], "tunnel dump");

  const warpArgs = ["tunnel", "dump"];
  if (useJson) warpArgs.push("--json");

  const result = await callWarpLenient(ctx.runner, warpArgs);
  const items = parseTunnelDump(result.stdout);

  return {
    stdout: renderListBlock({
      noun: "routes",
      items,
      schema: TUNNEL_SCHEMA,
      empty: "routes: no split tunnel routes configured",
      truncatedHint: "Run `warp-axi tunnel dump --json` for the full set",
    }),
    exitCode: 0,
  };
}

async function tunnelStats(
  ctx: CommandContext,
  args: string[],
): Promise<{ stdout: string; exitCode: number }> {
  const useJson = takeBoolFlag(args, "--json");
  validateFlags(args, ["--json"], "tunnel stats");

  const warpArgs = ["tunnel", "stats"];
  if (useJson) warpArgs.push("--json");

  const result = await callWarp(ctx.runner, warpArgs);
  try {
    const data = JSON.parse(result.stdout);
    return { stdout: renderDetail("stats", data, STATS_SCHEMA), exitCode: 0 };
  } catch {
    return { stdout: renderDetail("stats", { raw: result.stdout }, RAW_SCHEMA), exitCode: 0 };
  }
}
