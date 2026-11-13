import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp, callWarpLenient, type WarpResult } from "../warp.js";
import { takeFlag, takeBoolFlag } from "../args.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderHelp, renderError, renderOutput, field, boolYesNo, custom, mapEnum, type Schema } from "../toon.js";

const STATUS_SCHEMA: Schema = {
  status: field("status"),
  registration: custom((item: Record<string, unknown>) => {
    const raw = item.registration as Record<string, unknown> | undefined;
    return raw ? "registered" : "unregistered";
  }),
  accountId: field("account_id"),
};

const STATUS_DETAIL_SCHEMA: Schema = {
  status: field("status"),
  organization: custom((item: Record<string, unknown>) => {
    const raw = item.registration as Record<string, unknown> | undefined;
    if (!raw) return "unregistered";
    return raw.organization ? String(raw.organization) : "registered";
  }),
  accountId: field("account_id"),
  enrollmentType: custom((item: Record<string, unknown>) => {
    const raw = item.registration as Record<string, unknown> | undefined;
    if (!raw) return undefined;
    return raw.type ? String(raw.type) : undefined;
  }),
  deviceUid: custom((item: Record<string, unknown>) => {
    const raw = item.registration as Record<string, unknown> | undefined;
    if (!raw) return undefined;
    return raw.uid ? String(raw.uid) : undefined;
  }),
  protocol: field("protocol"),
  vnet: field("vnet"),
};

function parseStatusJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return { status: text.trim() };
  }
}

function parseStatusText(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*(.+?):\s+(.+)$/);
    if (m) {
      const key = m[1].trim().toLowerCase().replace(/\s+/g, "_");
      result[key] = m[2].trim();
    }
  }
  if (!result.status) {
    result.status = text.includes("Connected") ? "Connected" : text.includes("Disconnected") ? "Disconnected" : "Unknown";
  }
  return result;
}

export const statusArea: CommandArea = {
  name: "status",
  aliases: ["info"],
  description: "Show WARP connection status and registration info",
  help: [
    "usage: warp-axi status [--json] [--detail]",
    "",
    "Show current WARP connection status.",
    "",
    "Flags:",
    "  --json    Use warp-cli --json for structured output",
    "  --detail  Show full registration details (org, device UID, protocol)",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };

    const useJson = takeBoolFlag(args, "--json");
    const detail = takeBoolFlag(args, "--detail");
    validateFlags(args, ["--json", "--detail"], "status");

    const warpArgs = ["status"];
    if (useJson) warpArgs.push("--json");

    const result = await callWarpLenient(ctx.runner, warpArgs);
    const parsed = useJson
      ? parseStatusJson(result.stdout)
      : parseStatusText(result.stdout);

    const schema = detail ? STATUS_DETAIL_SCHEMA : STATUS_SCHEMA;
    const output = renderDetail("status", parsed, schema);
    return { stdout: output, exitCode: 0 };
  },
};
