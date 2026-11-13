import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp, callWarpLenient } from "../warp.js";
import { takeFlag, takeBoolFlag } from "../args.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderList, renderHelp, renderError, renderOutput } from "../toon.js";
import { field, boolYesNo, custom, type Schema } from "../toon.js";

const REG_SCHEMA: Schema = {
  organization: custom((item: Record<string, unknown>) => {
    const org = item.organization;
    return org ? String(org) : "(none)";
  }),
  enrollmentType: field("type"),
  deviceUid: field("uid"),
  accountId: field("account_id"),
  enabled: field("enabled"),
};

function parseRegJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text.trim() };
  }
}

export const registrationArea: CommandArea = {
  name: "registration",
  aliases: ["reg"],
  description: "Show, create, or delete WARP Zero Trust registration",
  help: [
    "Usage: warp-axi registration <subcommand> [options]",
    "",
    "Subcommands:",
    "  show        Show current registration details",
    "  new         Register with a Zero Trust organization",
    "  delete      Delete current registration",
    "",
    "new flags:",
    "  --org <name>     Organization name (required)",
    "  --token <token>  MDM service token for headless enrollment",
    "  --json           Use structured output",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };

    const sub = args.shift();
    switch (sub) {
      case "show":
        return regShow(ctx, args);
      case "new":
        return regNew(ctx, args);
      case "delete":
        return regDelete(ctx, args);
      default:
        return { stdout: renderHelp(this.help), exitCode: 0 };
    }
  },
};

async function regShow(
  ctx: CommandContext,
  args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  const useJson = takeBoolFlag(args, "--json");
  validateFlags(args, ["--json"], "registration show");

  const warpArgs = ["registration", "show"];
  if (useJson) warpArgs.push("--json");

  const result = await callWarpLenient(ctx.runner, warpArgs);
  if (result.exitCode !== 0 && !result.stdout) {
    return {
      stdout: renderDetail("registration", { status: "not registered" }, REG_SCHEMA),
      exitCode: 0,
    };
  }

  const parsed = useJson ? parseRegJson(result.stdout) : parseRegText(result.stdout);
  return { stdout: renderDetail("registration", parsed, REG_SCHEMA), exitCode: 0 };
}

async function regNew(
  ctx: CommandContext,
  args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  const org = takeFlag(args, "org");
  const token = takeFlag(args, "token");
  const useJson = takeBoolFlag(args, "--json");
  validateFlags(args, ["--org", "--token", "--json"], "registration new");

  if (!org) {
    return {
      stdout: renderError("--org is required", "VALIDATION_ERROR", [
        "Usage: warp-axi registration new --org <name>",
        "Optionally add --token <mdm-token> for headless enrollment",
      ]),
      exitCode: 1,
    };
  }

  const warpArgs = ["registration", "new", "--organization", org];
  if (token) {
    warpArgs.push("--service-token", token);
  }

  const result = await callWarp(ctx.runner, warpArgs);
  return { stdout: renderDetail("registration", { status: "registered", organization: org }, REG_SCHEMA), exitCode: 0 };
}

async function regDelete(
  ctx: CommandContext,
  args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  const useJson = takeBoolFlag(args, "--json");
  validateFlags(args, ["--json"], "registration delete");

  const warpArgs = ["registration", "delete"];
  await callWarp(ctx.runner, warpArgs);
  return { stdout: renderDetail("registration", { status: "deleted" }, REG_SCHEMA), exitCode: 0 };
}

function parseRegText(text: string): Record<string, unknown> {
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
