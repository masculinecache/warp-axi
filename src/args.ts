export function takeFlag(args: string[], flag: string): string | undefined {
  const eqFlag = `--${flag}=`;
  const idx = args.findIndex((a) => a === `--${flag}` || a.startsWith(eqFlag));
  if (idx === -1) return undefined;
  const arg = args[idx];
  if (arg.startsWith(eqFlag)) {
    args.splice(idx, 1);
    return arg.slice(eqFlag.length);
  }
  const value = args[idx + 1];
  if (value === undefined || value.startsWith("--")) {
    args.splice(idx, 1);
    return "";
  }
  args.splice(idx, 2);
  return value;
}

export function takeBoolFlag(args: string[], flag: string): boolean {
  const idx = args.indexOf(`--${flag}`);
  if (idx === -1) return false;
  args.splice(idx, 1);
  return true;
}

export function takeAllFlags(args: string[], flags: string[]): string[] {
  const taken: string[] = [];
  for (const flag of flags) {
    const idx = args.indexOf(`--${flag}`);
    if (idx !== -1) {
      taken.push(flag);
      args.splice(idx, 1);
    }
  }
  return taken;
}

export function hasFlag(args: string[], flag: string): boolean {
  return args.includes(`--${flag}`);
}

export function getFlag(args: string[], name: string): string | undefined {
  const eqFlag = `--${name}=`;
  const idx = args.findIndex((a) => a === `--${name}` || a.startsWith(eqFlag));
  if (idx === -1) return undefined;
  const arg = args[idx];
  if (arg.startsWith(eqFlag)) return arg.slice(eqFlag.length);
  return args[idx + 1];
}

export function getPositional(args: string[], startIdx: number): string | undefined {
  for (let i = startIdx; i < args.length; i++) {
    if (!args[i].startsWith("--")) return args[i];
  }
  return undefined;
}
