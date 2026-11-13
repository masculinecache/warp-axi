import { describe, it, expect, vi } from "vitest";
import { run, AxiError, exitCodeForError } from "../src/cli.js";
import { WarpRunner, WarpResult } from "../src/warp.js";

function makeRunner(routes: Record<string, WarpResult>): WarpRunner {
  return {
    run: vi.fn(async (args: string[]) => {
      const key = args.join(" ");
      for (const [pattern, result] of Object.entries(routes)) {
        if (key === pattern || key.includes(pattern)) return result;
      }
      return { stdout: "", stderr: "", exitCode: 1 };
    }),
  };
}

describe("warp-axi CLI", () => {
  describe("top-level", () => {
    it("shows help with no args", async () => {
      const { stdout, exitCode } = await run([], makeRunner({}));
      expect(exitCode).toBe(0);
      expect(stdout).toContain("bin: warp-axi");
      expect(stdout).toContain("status");
      expect(stdout).toContain("connect");
      expect(stdout).toContain("registration");
    });

    it("shows help with --help", async () => {
      const { stdout, exitCode } = await run(["--help"], makeRunner({}));
      expect(exitCode).toBe(0);
      expect(stdout).toContain("bin: warp-axi");
    });

    it("shows version with --version", async () => {
      const { stdout, exitCode } = await run(["--version"], makeRunner({}));
      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/^\d+\.\d+\.\d+/);
    });

    it("errors on unknown command", async () => {
      const { stdout, exitCode } = await run(["bogus"], makeRunner({}));
      expect(exitCode).toBe(1);
      expect(stdout).toContain("unknown command");
    });
  });

  describe("status", () => {
    it("shows connection status", async () => {
      const runner = makeRunner({
        "status": {
          stdout: "Status: Connected\nAccount: test@org.com",
          stderr: "",
          exitCode: 0,
        },
      });
      const { stdout, exitCode } = await run(["status"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Connected");
    });

    it("shows detail with --detail", async () => {
      const runner = makeRunner({
        "status": {
          stdout: JSON.stringify({
            status: "Connected",
            registration: { organization: "testorg", type: "team", uid: "abc" },
          }),
          stderr: "",
          exitCode: 0,
        },
      });
      const { stdout, exitCode } = await run(["status", "--detail"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Connected");
    });

    it("passes --json through", async () => {
      const runner = makeRunner({
        "status": {
          stdout: JSON.stringify({ status: "Connected" }),
          stderr: "",
          exitCode: 0,
        },
      });
      const { stdout, exitCode } = await run(["status", "--json"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Connected");
    });
  });

  describe("connect / disconnect", () => {
    it("connects", async () => {
      const runner = makeRunner({
        "connect": { stdout: "Success", stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["connect"], runner);
      expect(exitCode).toBe(0);
    });

    it("disconnects", async () => {
      const runner = makeRunner({
        "disconnect": { stdout: "Success", stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["disconnect"], runner);
      expect(exitCode).toBe(0);
    });
  });

  describe("registration", () => {
    it("shows registration", async () => {
      const runner = makeRunner({
        "registration show": {
          stdout: "Organization: testorg\nType: team",
          stderr: "",
          exitCode: 0,
        },
      });
      const { stdout, exitCode } = await run(["registration", "show"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("testorg");
    });

    it("errors on registration new without org", async () => {
      const runner = makeRunner({});
      const { stdout, exitCode } = await run(["registration", "new"], runner);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("org");
    });
  });

  describe("tunnel", () => {
    it("dumps split tunnel routes", async () => {
      const runner = makeRunner({
        "tunnel dump": {
          stdout: JSON.stringify([
            { cidr: "10.0.0.0/8", description: "RFC1918", type: "exclude" },
            { cidr: "172.16.0.0/12", description: "RFC1918", type: "exclude" },
          ]),
          stderr: "",
          exitCode: 0,
        },
      });
      const { stdout, exitCode } = await run(["tunnel", "dump"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("10.0.0.0/8");
    });

    it("shows tunnel stats", async () => {
      const runner = makeRunner({
        "tunnel stats": {
          stdout: JSON.stringify({ rx: "1.2 GB", tx: "3.4 GB" }),
          stderr: "",
          exitCode: 0,
        },
      });
      const { stdout, exitCode } = await run(["tunnel", "stats"], runner);
      expect(exitCode).toBe(0);
    });
  });

  describe("settings", () => {
    it("shows client settings", async () => {
      const runner = makeRunner({
        "settings": { stdout: "Mode: Warp\nDNS: 1.1.1.1", stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["settings"], runner);
      expect(exitCode).toBe(0);
    });
  });

  describe("debug", () => {
    it("runs network debug", async () => {
      const runner = makeRunner({
        "debug network": { stdout: "Status: OK", stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["debug", "network"], runner);
      expect(exitCode).toBe(0);
    });

    it("errors on unknown debug subcommand", async () => {
      const runner = makeRunner({});
      const { stdout, exitCode } = await run(["debug", "bogus"], runner);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("unknown debug subcommand");
    });
  });

  describe("vnet", () => {
    it("lists virtual networks", async () => {
      const runner = makeRunner({
        "virtual-network list": { stdout: "default  abc123  yes", stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["vnet", "list"], runner);
      expect(exitCode).toBe(0);
    });

    it("errors on vnet add without name", async () => {
      const runner = makeRunner({});
      const { stdout, exitCode } = await run(["vnet", "add"], runner);
      expect(exitCode).toBe(1);
      expect(stdout).toContain("name");
    });
  });

  describe("target", () => {
    it("lists targets", async () => {
      const runner = makeRunner({
        "target list": { stdout: "nasbox  subnet  xyz789", stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["target", "list"], runner);
      expect(exitCode).toBe(0);
    });

    it("shows empty state when no targets", async () => {
      const runner = makeRunner({
        "target list": { stdout: "", stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["target", "list"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("no infrastructure targets");
    });
  });

  describe("error mapping", () => {
    it("maps ENOENT to WARP_NOT_INSTALLED", () => {
      const err = new AxiError("WARP_NOT_INSTALLED", "warp-cli is not installed", []);
      expect(exitCodeForError(err)).toBe(1);
    });
  });

  describe("area help", () => {
    it("shows area help with --help after area name", async () => {
      const { stdout, exitCode } = await run(["status", "--help"], makeRunner({}));
      expect(exitCode).toBe(0);
      expect(stdout).toContain("warp-axi status");
    });
  });
});
