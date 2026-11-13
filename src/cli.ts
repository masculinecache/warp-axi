import { WarpRunner, realRunner, callWarp, callWarpLenient } from "./warp.js";
import { AxiError, exitCodeForError } from "./errors.js";
import { wantsHelp } from "./util.js";
import { readPackageVersion } from "./version.js";

export interface CommandContext {
  runner: WarpRunner;
  cwd?: string;
}

export interface CommandArea {
  name: string;
  aliases?: string[];
  description: string;
  help: string[];
  run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }>;
}

import { statusArea } from "./commands/status.js";
import { registrationArea } from "./commands/registration.js";
import { connectArea, disconnectArea } from "./commands/connect.js";
import { tunnelArea } from "./commands/tunnel.js";
import { settingsArea } from "./commands/settings.js";
import { debugArea } from "./commands/debug.js";
import { vnetArea } from "./commands/vnet.js";
import { targetArea } from "./commands/target.js";

const areas: CommandArea[] = [
  statusArea,
  registrationArea,
  connectArea,
  disconnectArea,
  tunnelArea,
  settingsArea,
  debugArea,
  vnetArea,
  targetArea,
];

function resolveArea(name: string): CommandArea | undefined {
  return areas.find((a) => a.name === name || (a.aliases && a.aliases.includes(name)));
}

function renderTopLevelHelp(): string {
  const lines: string[] = [
    `bin: warp-axi`,
    `description: Agent-ergonomic wrapper for Cloudflare WARP CLI (warp-cli)`,
    ``,
  ];
  areas.forEach((a, i) => {
    lines.push(`help[${i}]:`);
    lines.push(`  ${a.name.padEnd(14)}${a.description}`);
  });
  lines.push(``, `help[${areas.length}]:`, `  --help          Show this help`, `  --version       Show version`);
  return lines.join("\n");
}

export async function run(
  argv: string[],
  runner?: WarpRunner,
  cwd?: string,
): Promise<{ stdout: string; exitCode: number }> {
  const ctx: CommandContext = { runner: runner ?? realRunner(), cwd };

  if (argv.length === 0) {
    return { stdout: renderTopLevelHelp(), exitCode: 0 };
  }

  if (argv.length === 1 && wantsHelp(argv)) {
    return { stdout: renderTopLevelHelp(), exitCode: 0 };
  }

  const [first, ...rest] = argv;

  if (first === "--version" || first === "-V") {
    const version = await readPackageVersion();
    return { stdout: version, exitCode: 0 };
  }

  const area = resolveArea(first);
  if (!area) {
    return {
      stdout: `warp-axi: unknown command '${first}'. Run 'warp-axi --help' for available commands.`,
      exitCode: 1,
    };
  }

  if (rest.length > 0 && wantsHelp(rest)) {
    return {
      stdout: [`bin: warp-axi ${area.name}`, `description: ${area.description}`, ``, ...area.help].join("\n"),
      exitCode: 0,
    };
  }

  return area.run(ctx, rest);
}

export { areas, AxiError, exitCodeForError, callWarp, callWarpLenient };
