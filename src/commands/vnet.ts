import { CommandArea, CommandContext } from "../cli.js";
import { callWarp, callWarpLenient } from "../warp.js";
import { takeFlag, takeBoolFlag, hasFlag } from "../args.js";
import { validateFlags } from "../util.js";
import { renderList, renderDetail, renderError, renderOutput, field, boolYesNo, type Schema } from "../toon.js";
import { renderListBlock } from "../list.js";

const vnetSubcommands = ["add", "remove", "list"];

const vnetSchema: Schema = {
  name: field("name"),
  id: field("vnet_id"),
  is_default: boolYesNo("is_default"),
};

function renderVnetHelp(): string[] {
  return [
    `usage: warp-axi vnet <subcommand> [flags]`,
    ``,
    `Subcommands:`,
    `  add <name>           Create a virtual network`,
    `  remove <name>        Remove a virtual network`,
    `  list                 List virtual networks`,
    ``,
    `Flags:`,
    `  --json               Raw JSON output`,
    `  --help               Show this help`,
  ];
}

export const vnetArea: CommandArea = {
  name: "vnet",
  description: "Virtual network management",
  help: renderVnetHelp(),
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (args.length === 0) {
      return { stdout: renderVnetHelp().join("\n"), exitCode: 0 };
    }

    const [sub, ...rest] = args;

    if (!vnetSubcommands.includes(sub)) {
      return {
        stdout: renderError(`unknown vnet subcommand '${sub}'`, "VALIDATION_ERROR", [
          `Available: ${vnetSubcommands.join(", ")}`,
        ]),
        exitCode: 1,
      };
    }

    const useJson = hasFlag(rest, "--json");

    if (sub === "list") {
      const warpArgs = ["virtual-network", "list"];
      if (useJson) warpArgs.push("--json");

      try {
        const result = await callWarpLenient(ctx.runner, warpArgs);
        if (useJson) return { stdout: result.stdout.trim(), exitCode: 0 };

        const lines = result.stdout.trim().split("\n").filter((l) => l.trim());
        if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
          return {
            stdout: renderOutput([`vnets: no virtual networks configured`]),
            exitCode: 0,
          };
        }

        const items = lines.map((line) => {
          const parts = line.split(/\s{2,}/);
          return {
            name: parts[0] ?? "",
            vnet_id: parts[1] ?? "",
            is_default: parts[2]?.toLowerCase() === "true" || parts[2]?.toLowerCase() === "yes",
          };
        });

        return {
          stdout: renderOutput([
            renderListBlock({
              noun: "vnets",
              items,
              schema: vnetSchema,
              empty: "vnets: no virtual networks configured",
            }),
          ]),
          exitCode: 0,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { stdout: renderError(message, "UNKNOWN"), exitCode: 1 };
      }
    }

    if (sub === "add" || sub === "remove") {
      const positionalArgs = rest.filter((a) => !a.startsWith("--"));
      const name = positionalArgs[0];
      if (!name) {
        return {
          stdout: renderError(`vnet ${sub} requires a name`, "VALIDATION_ERROR", [
            `Usage: warp-axi vnet ${sub} <name>`,
          ]),
          exitCode: 1,
        };
      }

      const warpArgs = ["virtual-network", sub, name];
      try {
        const result = await callWarp(ctx.runner, warpArgs);
        return { stdout: result.stdout.trim(), exitCode: 0 };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { stdout: renderError(message, "UNKNOWN"), exitCode: 1 };
      }
    }

    return { stdout: renderVnetHelp().join("\n"), exitCode: 0 };
  },
};
