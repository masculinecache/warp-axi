import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarp } from "../warp.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderHelp, field, type Schema } from "../toon.js";

const CONN_SCHEMA: Schema = {
  status: field("status"),
};

export const connectArea: CommandArea = {
  name: "connect",
  description: "Connect to WARP",
  help: [
    "usage: warp-axi connect",
    "",
    "Establish a WARP connection.",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };
    validateFlags(args, [], "connect");

    await callWarp(ctx.runner, ["connect"]);
    return { stdout: renderDetail("connect", { status: "connecting" }, CONN_SCHEMA), exitCode: 0 };
  },
};

export const disconnectArea: CommandArea = {
  name: "disconnect",
  description: "Disconnect from WARP",
  help: [
    "usage: warp-axi disconnect",
    "",
    "Disconnect the WARP connection.",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };
    validateFlags(args, [], "disconnect");

    await callWarp(ctx.runner, ["disconnect"]);
    return { stdout: renderDetail("disconnect", { status: "disconnected" }, CONN_SCHEMA), exitCode: 0 };
  },
};
