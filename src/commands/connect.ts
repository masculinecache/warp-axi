import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp, callWarpLenient } from "../warp.js";
import { takeBoolFlag } from "../args.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderHelp, renderError, field, custom, type Schema } from "../toon.js";

const CONN_SCHEMA: Schema = {
  status: field("status"),
  protocol: field("protocol"),
  clientIp: custom((item: Record<string, unknown>) => {
    const ip = item.warp_enabled ?? item.client_ip;
    return ip ? String(ip) : undefined;
  }),
  serverIp: custom((item: Record<string, unknown>) => {
    const ip = item.server_ip ?? item.endpoint;
    return ip ? String(ip) : undefined;
  }),
};

export const connectArea: CommandArea = {
  name: "connect",
  description: "Connect to WARP",
  help: [
    "usage: warp-axi connect [--json]",
    "",
    "Establish a WARP connection.",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };
    const useJson = takeBoolFlag(args, "--json");
    validateFlags(args, ["--json"], "connect");

    await callWarp(ctx.runner, ["connect"]);
    return { stdout: renderDetail("connect", { status: "connecting" }, CONN_SCHEMA), exitCode: 0 };
  },
};

export const disconnectArea: CommandArea = {
  name: "disconnect",
  description: "Disconnect from WARP",
  help: [
    "usage: warp-axi disconnect [--json]",
    "",
    "Disconnect the WARP connection.",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };
    const useJson = takeBoolFlag(args, "--json");
    validateFlags(args, ["--json"], "disconnect");

    await callWarp(ctx.runner, ["disconnect"]);
    return { stdout: renderDetail("disconnect", { status: "disconnected" }, CONN_SCHEMA), exitCode: 0 };
  },
};
