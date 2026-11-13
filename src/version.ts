import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let cached: string | undefined;

export function readPackageVersion(): string {
  if (cached) return cached;
  const dir = dirname(fileURLToPath(import.meta.url));
  for (let d = dir; d !== "/"; d = dirname(d)) {
    try {
      const pkg = JSON.parse(readFileSync(join(d, "package.json"), "utf8"));
      if (pkg.version) {
        cached = String(pkg.version);
        return cached;
      }
    } catch {
      continue;
    }
  }
  return "0.0.0";
}
