import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../src/index.js";

describe("based cli", () => {
  it("checks valid files", async () => {
    const fixture = path.resolve("tests/fixtures/main.fr");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const status = await runCli(["check", fixture]);
    expect(status).toBe(0);

    log.mockRestore();
  });

  it("runs main(payload) with inline payload", async () => {
    const fixture = path.resolve("tests/fixtures/main.fr");
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    const status = await runCli(["run", fixture, "--payload", "{\"a\":2,\"b\":5}"]);
    expect(status).toBe(0);
    expect(log).toHaveBeenCalledWith("7");

    log.mockRestore();
  });

  it("formats .fr files deterministically", async () => {
    const folder = await mkdtemp(path.join(tmpdir(), "based-fmt-"));
    const file = path.join(folder, "messy.fr");
    await writeFile(
      file,
      "cook main(payload)\n\tlowkey x is payload.a + payload.b\n\tsecure x\n",
      "utf8"
    );

    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const status = await runCli(["fmt", file]);
    expect(status).toBe(0);

    const after = await readFile(file, "utf8");
    expect(after).toContain("  lowkey x is payload.a + payload.b");

    log.mockRestore();
  });
});
