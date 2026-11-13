import { CommandArea, CommandContext } from "../cli.js";
import { callWarpLenient } from "../warp.js";
import { hasFlag } from "../args.js";
import { renderDetail, renderError, renderOutput, field, type Schema } from "../toon.js";

const debugSubcommands = ["network", "posture", "connectivity-check"];

const networkSchema: Schema = {
  status: field("status"),
  local_ip: field("local_ip"),
  gateway_ip: field("gateway_ip"),
  dns_server: field("dns_server"),
  interface: field("interface"),
};

const postureSchema: Schema = {
  status: field("status"),
  compliance_state: field("compliance_state"),
  serial_number: field("serial_number"),
  device_id: field("device_id"),
};

const connectivitySchema: Schema = {
  result: field("result"),
  summary: field("summary"),
};

const fallbackSchema: Schema = {
  status: field("status"),
};

function renderDebugHelp(): string[] {
  return [
    "usage: warp-axi debug <subcommand> [flags]",
    "",
    "Subcommands:",
    "  network              Network debug info",
    "  posture              Device posture state",
    "  connectivity-check   Test connectivity to Cloudflare",
    "",
    "Flags:",
    "  --json               Raw JSON output",
    "  --help               Show this help",
  ];
}

export const debugArea: CommandArea = {
  name: "debug",
  description: "Network, posture, and connectivity diagnostics",
  help: renderDebugHelp(),
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (args.length === 0) {
      return { stdout: renderDebugHelp().join("\n"), exitCode: 0 };
    }

    const [sub, ...rest] = args;

    if (!debugSubcommands.includes(sub)) {
      return {
        stdout: renderError(`unknown debug subcommand '${sub}'`, "VALIDATION_ERROR", [
          `Available: ${debugSubcommands.join(", ")}`,
        ]),
        exitCode: 1,
      };
    }

    const useJson = hasFlag(rest, "--json");
    const warpArgs = ["debug", sub];
    if (useJson) warpArgs.push("--json");

    try {
      const result = await callWarpLenient(ctx.runner, warpArgs);
      if (useJson) {
        return { stdout: result.stdout.trim(), exitCode: 0 };
      }

      let schema = fallbackSchema;
      if (sub === "network") schema = networkSchema;
      else if (sub === "posture") schema = postureSchema;
      else if (sub === "connectivity-check") schema = connectivitySchema;

      const label = `debug-${sub}`;
      return {
        stdout: renderOutput([renderDetail(label, { status: result.stdout.trim() }, schema)]),
        exitCode: 0,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { stdout: renderError(message, "UNKNOWN"), exitCode: 1 };
    }
  },
};
