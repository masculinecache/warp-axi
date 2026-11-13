import { AxiError } from "axi-sdk-js";

const ALWAYS_ALLOWED = new Set(["--help", "-h", "--json"]);

export function validateFlags(
  args: string[],
  valid: string[],
  commandName: string
): void {
  const validSet = new Set([...valid, ...ALWAYS_ALLOWED]);
  const unknown: string[] = [];
  for (const arg of args) {
    if (arg.startsWith("--") && !validSet.has(arg)) {
      unknown.push(arg);
    }
  }
  if (unknown.length > 0) {
    throw new AxiError(
      "VALIDATION_ERROR",
      `Unknown flag(s) for ${commandName}: ${unknown.join(", ")}`,
      [`Valid flags: ${valid.sort().join(", ")}`, "Run with --help for usage"]
    );
  }
}

export function wantsHelp(args: string[]): boolean {
  return args.includes("--help") || args.includes("-h");
}
