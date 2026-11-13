import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp, callWarpLenient } from "../warp.js";
import { takeBoolFlag } from "../args.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderList, renderHelp, field, custom, type Schema } from "../toon.js";

const SETTINGS_SCHEMA: Schema = {
  mode: field("mode"),
  excludeRoutes: custom((item: Record<string, unknown>) => {
    const exclude = item.exclude_routes ?? item.exclude;
    if (Array.isArray(exclude)) return exclude.join(", ");
    return exclude ? String(exclude) : undefined;
  }),
  includeRoutes: custom((item: Record<string, unknown>) => {
    const include = item.include_routes ?? item.include;
    if (Array.isArray(include)) return include.join(", ");
    return include ? String(include) : undefined;
  }),
  dns: field("dns"),
  proxy: field("proxy"),
};

function parseSettingsJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return parseSettingsText(text);
  }
}

function parseSettingsText(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(.+?):\s+(.+)$/);
    if (m) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, "_");
      result[key] = m[2].trim();
    }
  }
  return result;
}

export const settingsArea: CommandArea = {
  name: "settings",
  aliases: ["config"],
  description: "Show WARP client settings and configuration",
  help: [
    "usage: warp-axi settings [--json]",
    "",
    "Show current WARP client settings.",
    "",
    "Flags:",
    "  --json    Use warp-cli --json for structured output",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };

    const useJson = takeBoolFlag(args, "--json");
    validateFlags(args, ["--json"], "settings");

    const warpArgs = ["settings"];
    if (useJson) warpArgs.push("--json");

    const result = await callWarpLenient(ctx.runner, warpArgs);
    const parsed = useJson ? parseSettingsJson(result.stdout) : parseSettingsText(result.stdout);

    return { stdout: renderDetail("settings", parsed, SETTINGS_SCHEMA), exitCode: 0 };
  },
};
