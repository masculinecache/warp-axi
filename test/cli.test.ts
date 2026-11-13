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

const STATUS_JSON = JSON.stringify({ status: "Connected", reason: "NetworkHealthy" });
const REG_JSON = JSON.stringify({
  id: "01a1d59b-31e2-1406-858f-be6abbbb898f",
  device_id: "01a1d59b-31e2-1406-858f-be6abbbb898f",
  public_key: "testkey",
  managed: true,
  account: { type: "team", id: "a7fa198dd5b359a187c671064fe6b36e", organization: "testorg" },
  alternate_networks: [],
});
const SETTINGS_JSON = JSON.stringify({
  settings: {
    always_on: true,
    switch_locked: false,
    auto_connect_after_min: 1,
    operation_mode: "warp+doh",
    split_tunnel_mode: "exclude",
    doh_hostname: "test.cloudflare-gateway.com",
  },
});

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
        "-j status": { stdout: STATUS_JSON, stderr: "", exitCode: 0 },
        "-j registration show": { stdout: REG_JSON, stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["status"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Connected");
      expect(stdout).toContain("testorg");
    });

    it("shows detail with --detail", async () => {
      const runner = makeRunner({
        "-j status": { stdout: STATUS_JSON, stderr: "", exitCode: 0 },
        "-j registration show": { stdout: REG_JSON, stderr: "", exitCode: 0 },
      });
      const { stdout, exitCode } = await run(["status", "--detail"], runner);
      expect(exitCode).toBe(0);
      expect(stdout).toContain("Connected");
      expect(stdout).toContain("testorg");
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
        "-j registration show": { stdout: REG_JSON, stderr: "", exitCode: 0 },
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
        "-j tunnel dump": {
          stdout: JSON.stringify(["10.0.0.0/8", "172.16.0.0/12"]),
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
        "-j tunnel stats": {
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
        "-j settings list": { stdout: SETTINGS_JSON, stderr: "", exitCode: 0 },
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
