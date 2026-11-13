import { type CommandArea, type CommandContext } from "../cli.js";
import { callWarpJsonLenient } from "../warp.js";
import { wantsHelp, validateFlags } from "../util.js";
import { renderDetail, renderHelp, field, custom, type Schema } from "../toon.js";

const SETTINGS_SCHEMA: Schema = {
  mode: custom((item: Record<string, unknown>) => {
    const settings = item.settings as Record<string, unknown> | undefined;
    return settings?.operation_mode ? String(settings.operation_mode) : undefined;
  }),
  splitTunnelMode: custom((item: Record<string, unknown>) => {
    const settings = item.settings as Record<string, unknown> | undefined;
    return settings?.split_tunnel_mode ? String(settings.split_tunnel_mode) : undefined;
  }),
  alwaysOn: custom((item: Record<string, unknown>) => {
    const settings = item.settings as Record<string, unknown> | undefined;
    return settings?.always_on != null ? String(settings.always_on) : undefined;
  }),
  autoConnect: custom((item: Record<string, unknown>) => {
    const settings = item.settings as Record<string, unknown> | undefined;
    return settings?.auto_connect_after_min != null ? String(settings.auto_connect_after_min) + " min" : undefined;
  }),
  dohHostname: custom((item: Record<string, unknown>) => {
    const settings = item.settings as Record<string, unknown> | undefined;
    return settings?.doh_hostname ? String(settings.doh_hostname) : undefined;
  }),
};

function parseJson(text: string): Record<string, unknown> {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

export const settingsArea: CommandArea = {
  name: "settings",
  aliases: ["config"],
  description: "Show WARP client settings and configuration",
  help: [
    "usage: warp-axi settings",
    "",
    "Show current WARP client settings.",
  ],
  async run(ctx: CommandContext, args: string[]): Promise<{ stdout: string; exitCode: number }> {
    if (wantsHelp(args)) return { stdout: renderHelp(this.help), exitCode: 0 };
    validateFlags(args, [], "settings");

    const result = await callWarpJsonLenient(ctx.runner, ["settings", "list"]);
    const parsed = parseJson(result.stdout);

    return { stdout: renderDetail("settings", parsed, SETTINGS_SCHEMA), exitCode: 0 };
  },
};
