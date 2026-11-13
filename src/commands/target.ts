import { CommandArea, CommandContext } from "../cli.js";
import { callWarp, callWarpLenient } from "../warp.js";
import { hasFlag } from "../args.js";
import { renderList, renderDetail, renderError, renderOutput, field, boolYesNo, type Schema } from "../toon.js";
import { renderListBlock } from "../list.js";

const targetSubcommands = ["list"];

const targetSchema: Schema = {
  name: field("name"),
  type: field("type"),
  id: field("target_id"),
};

function renderTargetHelp(): string[] {
  return [
    `usage: warp-axi target <subcommand> [flags]`,
    ``,
    `Subcommands:`,
    `  list                 List infrastructure targets`,
    ``,
    `Flags:`,
    `  --json               Raw JSON output`,
    `  --help               Show this help`,
  ];
}

export const targetArea: CommandArea = {
  name: "target",
  description: "Infrastructure target management",
  help: renderTargetHelp(),
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (args.length === 0) {
      return { stdout: renderTargetHelp().join("\n"), exitCode: 0 };
    }

    const [sub, ...rest] = args;

    if (!targetSubcommands.includes(sub)) {
      return {
        stdout: renderError(`unknown target subcommand '${sub}'`, "VALIDATION_ERROR", [
          `Available: ${targetSubcommands.join(", ")}`,
        ]),
        exitCode: 1,
      };
    }

    const useJson = hasFlag(rest, "--json");

    if (sub === "list") {
      const warpArgs = ["target", "list"];
      if (useJson) warpArgs.push("--json");

      try {
        const result = await callWarpLenient(ctx.runner, warpArgs);
        if (useJson) return { stdout: result.stdout.trim(), exitCode: 0 };

        const lines = result.stdout.trim().split("\n").filter((l) => l.trim());
        if (lines.length === 0 || (lines.length === 1 && lines[0] === "")) {
          return {
            stdout: renderOutput([`targets: no infrastructure targets configured`]),
            exitCode: 0,
          };
        }

        const items = lines.map((line) => {
          const parts = line.split(/\s{2,}/);
          return {
            name: parts[0] ?? "",
            type: parts[1] ?? "",
            target_id: parts[2] ?? "",
          };
        });

        return {
          stdout: renderOutput([
            renderListBlock({
              noun: "targets",
              items,
              schema: targetSchema,
              empty: "targets: no infrastructure targets configured",
            }),
          ]),
          exitCode: 0,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { stdout: renderError(message, "UNKNOWN"), exitCode: 1 };
      }
    }

    return { stdout: renderTargetHelp().join("\n"), exitCode: 0 };
  },
};
