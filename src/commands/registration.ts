import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp, callWarpJsonLenient } from "../warp.js";
import { takeFlag, takeBoolFlag } from "../args.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderHelp, renderError, renderOutput, field, custom, type Schema } from "../toon.js";

const REG_SCHEMA: Schema = {
  organization: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.organization ? String(acct.organization) : "(none)";
  }),
  accountType: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.type ? String(acct.type) : undefined;
  }),
  managed: field("managed"),
  deviceId: field("device_id"),
  accountId: custom((item: Record<string, unknown>) => {
    const acct = item.account as Record<string, unknown> | undefined;
    return acct?.id ? String(acct.id) : undefined;
  }),
};

function parseJson(text: string): Record<string, unknown> {
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
  _args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  validateFlags(_args, [], "registration show");

  const result = await callWarpJsonLenient(ctx.runner, ["registration", "show"]);
  if (result.exitCode !== 0 && !result.stdout) {
    return {
      stdout: renderDetail("registration", { status: "not registered" }, REG_SCHEMA),
      exitCode: 0,
    };
  }

  const parsed = parseJson(result.stdout);
  return { stdout: renderDetail("registration", parsed, REG_SCHEMA), exitCode: 0 };
}

async function regNew(
  ctx: CommandContext,
  args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  const org = takeFlag(args, "org");
  const token = takeFlag(args, "token");
  validateFlags(args, ["--org", "--token"], "registration new");

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

  await callWarp(ctx.runner, warpArgs);
  return { stdout: renderDetail("registration", { status: "registered", organization: org }, REG_SCHEMA), exitCode: 0 };
}

async function regDelete(
  ctx: CommandContext,
  _args: string[]
): Promise<{ stdout: string; exitCode: number }> {
  validateFlags(_args, [], "registration delete");

  await callWarp(ctx.runner, ["registration", "delete"]);
  return { stdout: renderDetail("registration", { status: "deleted" }, REG_SCHEMA), exitCode: 0 };
}
