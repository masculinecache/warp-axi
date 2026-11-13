export interface WarpResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface WarpRunner {
  run(args: string[], options?: { input?: string }): Promise<WarpResult>;
}

import { spawn } from "node:child_process";
import { AxiError } from "axi-sdk-js";

const MAX_OUTPUT = 64 * 1024 * 1024;

export function realRunner(cwd?: string): WarpRunner {
  return {
    async run(
      args: string[],
      options?: { input?: string }
    ): Promise<WarpResult> {
      return new Promise((resolve, reject) => {
        const proc = spawn("warp-cli", args, {
          cwd,
          env: { ...process.env },
          stdio: ["pipe", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data: Buffer) => {
          if (stdout.length < MAX_OUTPUT) {
            stdout += data.toString();
          }
        });

        proc.stderr.on("data", (data: Buffer) => {
          if (stderr.length < MAX_OUTPUT) {
            stderr += data.toString();
          }
        });

        if (options?.input) {
          proc.stdin.write(options.input);
          proc.stdin.end();
        }

        proc.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "ENOENT") {
            reject(
              new AxiError(
                "WARP_NOT_INSTALLED",
                "warp-cli is not installed. Install cloudflare-warp package first.",
                ["Install: https://pkg.cloudflareclient.com/", "Or: brew install cloudflare-warp"]
              )
            );
          } else {
            reject(err);
          }
        });

        proc.on("close", (code) => {
          resolve({
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code ?? 0,
          });
        });
      });
    },
  };
}

export async function callWarp(
  runner: WarpRunner,
  args: string[],
  options?: { input?: string }
): Promise<WarpResult> {
  const result = await runner.run(args, options);
  if (result.exitCode !== 0) {
    throw mapWarpError(result.stderr || result.stdout, result.exitCode);
  }
  return result;
}

export async function callWarpLenient(
  runner: WarpRunner,
  args: string[],
  options?: { input?: string }
): Promise<WarpResult> {
  return runner.run(args, options);
}

interface ErrorPattern {
  pattern: RegExp;
  code: string;
  message: string;
  suggestions?: string[];
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /Registration\+failed|Unable to register/i,
    code: "REGISTRATION_FAILED",
    message: "WARP registration failed. The device could not enroll in the Zero Trust organization.",
    suggestions: [
      "Check that the MDM service token is valid and not expired",
      "Verify the organization name in the MDM configuration",
      "Ensure the device can reach api.cloudflareclient.com",
    ],
  },
  {
    pattern: /not\s+registered|No\s+registration/i,
    code: "NOT_REGISTERED",
    message: "WARP is not registered with a Zero Trust organization.",
    suggestions: [
      "Run: warp-axi registration new --org <org-name>",
      "Or: warp-cli registration new --organization <org>",
    ],
  },
  {
    pattern: /already\s+registered/i,
    code: "ALREADY_REGISTERED",
    message: "WARP is already registered. Delete the existing registration first.",
    suggestions: ["Run: warp-axi registration delete", "Then: warp-axi registration new --org <org>"],
  },
  {
    pattern: /connection\s+failed|Unable to connect/i,
    code: "CONNECTION_FAILED",
    message: "WARP could not establish a connection.",
    suggestions: [
      "Check network connectivity",
      "Run: warp-axi debug connectivity-check",
      "Check if another VPN is active",
    ],
  },
  {
    pattern: /authentication\s+failed|auth\s+error/i,
    code: "AUTH_FAILED",
    message: "WARP authentication failed. The Zero Trust enrollment may have expired.",
    suggestions: [
      "Delete and re-register: warp-axi registration delete && warp-axi registration new --org <org>",
      "Check that the MDM service token is still valid",
    ],
  },
  {
    pattern: /daemon\s+not\s+running|warp-svc/i,
    code: "DAEMON_NOT_RUNNING",
    message: "The WARP daemon (warp-svc) is not running.",
    suggestions: [
      "Start the service: sudo systemctl start warp-svc",
      "Check status: systemctl status warp-svc",
    ],
  },
  {
    pattern: /permission\s+denied|Operation\s+not\s+permitted/i,
    code: "PERMISSION_DENIED",
    message: "Permission denied. This command requires elevated privileges.",
    suggestions: ["Run with sudo or as root", "Check warp-svc daemon permissions"],
  },
];

function stripAnsi(text: string): string {
  return text.replace(
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g,
    ""
  );
}

export function mapWarpError(stderr: string, _exitCode: number): AxiError {
  const clean = stripAnsi(stderr);
  for (const { pattern, code, message, suggestions } of ERROR_PATTERNS) {
    if (pattern.test(clean)) {
      return new AxiError(code, message, suggestions);
    }
  }
  const firstLine = clean.split("\n").find((l) => l.trim()) ?? "Unknown error";
  return new AxiError("UNKNOWN", firstLine.trim());
}
