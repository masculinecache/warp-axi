import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarpJsonLenient } from "../warp.js";
import { takeBoolFlag } from "../args.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderHelp, renderOutput, field, custom, type Schema } from "../toon.js";

const STATUS_SCHEMA: Schema = {
  status: field("status"),
  reason: field("reason"),
  managed: field("managed"),
  organization: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.organization ? String(acct.organization) : undefined;
  }),
  accountType: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.type ? String(acct.type) : undefined;
  }),
};

const STATUS_DETAIL_SCHEMA: Schema = {
  status: field("status"),
  reason: field("reason"),
  id: field("id"),
  deviceId: field("device_id"),
  managed: field("managed"),
  accountType: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.type ? String(acct.type) : undefined;
  }),
  organization: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.organization ? String(acct.organization) : undefined;
  }),
  accountId: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.id ? String(acct.id) : undefined;
  }),
  publicKey: field("public_key"),
};

function parseJson(text: string): Record<string, unknown> {
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
    "usage: warp-axi status [--detail]",
    "",
    "Show current WARP connection status.",
    "Always uses warp-cli -j for structured JSON parsing.",
    "",
    "Flags:",
    "  --detail  Show full registration details (org, device ID, public key)",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };

    const detail = takeBoolFlag(args, "--detail");
    validateFlags(args, ["--detail"], "status");

    const statusResult = await callWarpJsonLenient(ctx.runner, ["status"]);
    const regResult = await callWarpJsonLenient(ctx.runner, ["registration", "show"]);

    const statusParsed = parseJson(statusResult.stdout);
    const regParsed = parseJson(regResult.stdout);

    const merged = { ...statusParsed, ...regParsed };

    if (!detail) {
      const textParsed = parseStatusText(statusResult.stdout);
      const base = statusParsed.status ? statusParsed : textParsed;
      const combined = { ...base, ...regParsed };
      const output = renderDetail("status", combined, STATUS_SCHEMA);
      return { stdout: output, exitCode: 0 };
    }

    const output = renderDetail("status", merged, STATUS_DETAIL_SCHEMA);
    return { stdout: output, exitCode: 0 };
  },
};
