import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp, callWarpJsonLenient } from "../warp.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderHelp, renderOutput, field, custom, type Schema } from "../toon.js";
import { renderListBlock } from "../list.js";

const TUNNEL_SCHEMA: Schema = {
  cidr: custom((item: Record<string, unknown>) => {
    if (typeof item === "string") return item;
    const cidr = item.cidr ?? item.address ?? item.value;
    return cidr ? String(cidr) : String(item.route ?? "unknown");
  }),
  description: field("description"),
};

const STATS_SCHEMA: Schema = {
  rx: field("rx"),
  tx: field("tx"),
  v4Endpoint: field("v4_endpoint"),
  v6Endpoint: field("v6_endpoint"),
};

function parseTunnelDump(text: string): Record<string, unknown>[] {
  try {
    const data = JSON.parse(text);
    if (Array.isArray(data)) {
      return data.map((item: unknown) => {
        if (typeof item === "string") return { cidr: item, description: "" };
        return item as Record<string, unknown>;
      });
    }
    if (data.routes) return data.routes;
    return [data];
  } catch {
    return [];
  }
}

export const tunnelArea: CommandArea = {
  name: "tunnel",
  aliases: ["split-tunnel", "routes"],
  description: "Show split tunnel configuration and routes",
  help: [
    "usage: warp-axi tunnel <subcommand>",
    "",
    "Subcommands:",
    "  dump        List all split tunnel routes",
    "  stats       Show tunnel traffic statistics",
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
  validateFlags(args, [], "tunnel dump");

  const result = await callWarpJsonLenient(ctx.runner, ["tunnel", "dump"]);
  const items = parseTunnelDump(result.stdout);

  return {
    stdout: renderListBlock({
      noun: "routes",
      items,
      schema: TUNNEL_SCHEMA,
      empty: "routes: no split tunnel routes configured",
    }),
    exitCode: 0,
  };
}

async function tunnelStats(
  ctx: CommandContext,
  args: string[],
): Promise<{ stdout: string; exitCode: number }> {
  validateFlags(args, [], "tunnel stats");

  const result = await callWarpJsonLenient(ctx.runner, ["tunnel", "stats"]);
  try {
    const data = JSON.parse(result.stdout);
    return { stdout: renderDetail("stats", data, STATS_SCHEMA), exitCode: 0 };
  } catch {
    return { stdout: result.stdout, exitCode: 0 };
  }
}
