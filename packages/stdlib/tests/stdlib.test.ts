import { describe, expect, it, vi } from "vitest";
import { BasedRuntimeError } from "@based/lang-core";
import { createStdlib } from "../src/index.js";

describe("stdlib", () => {
  it("reads env vars through vault", () => {
    const stdlib = createStdlib({
      env: {
        TOKEN: "abc"
      }
    });

    expect(stdlib.vault.get("TOKEN")).toBe("abc");
    expect(stdlib.vault.get("MISSING")).toBeNull();
  });

  it("parses network response as json then text", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        return new Response("ok", { status: 200 });
      }
      return new Response(JSON.stringify({ vibe: "based" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    });

    const stdlib = createStdlib({
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const getResult = await stdlib.network.get("https://api.example.com");
    expect(getResult.body).toEqual({ vibe: "based" });

    const postResult = await stdlib.network.post("https://api.example.com", { hi: true });
    expect(postResult.body).toBe("ok");
  });

  it("blocks non-allowlisted domains", async () => {
    const stdlib = createStdlib({
      allowlist: ["allowed.example.com"]
    });

    await expect(stdlib.network.get("https://denied.example.com")).rejects.toThrow(BasedRuntimeError);
  });

  it("sends webhook payloads for discord/slack", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ delivered: true }), { status: 200 }));

    const stdlib = createStdlib({
      env: {
        DISCORD_WEBHOOK_URL: "https://hooks.discord.example/abc",
        SLACK_WEBHOOK_URL: "https://hooks.slack.example/abc"
      },
      fetchImpl: fetchMock as unknown as typeof fetch
    });

    const discordRes = await stdlib.discord.send("hello");
    const slackRes = await stdlib.slack.send("hello");

    expect(discordRes.ok).toBe(true);
    expect(slackRes.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
