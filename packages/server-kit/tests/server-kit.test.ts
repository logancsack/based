import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createBasedHandler } from "../src/index.js";

const servers: Array<ReturnType<typeof createServer>> = [];

afterEach(async () => {
  await Promise.all(
    servers.map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        })
    )
  );
  servers.length = 0;
});

async function startServer(handler: ReturnType<typeof createBasedHandler>): Promise<string> {
  const server = createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to get test server address");
  }
  return `http://127.0.0.1:${address.port}`;
}

describe("server-kit", () => {
  it("executes webhook payload through main(payload)", async () => {
    const entryFile = path.resolve("tests/fixtures.webhook.fr");
    const url = await startServer(
      createBasedHandler({
        entryFile
      })
    );

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ value: 41 })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.result).toBe(42);
  });

  it("enforces optional HMAC signature", async () => {
    const entryFile = path.resolve("tests/fixtures.webhook.fr");
    const secret = "very-secret";
    const url = await startServer(
      createBasedHandler({
        entryFile,
        secret
      })
    );

    const payload = JSON.stringify({ value: 10 });
    const signature = createHmac("sha256", secret).update(Buffer.from(payload)).digest("hex");

    const unauthorized = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: payload
    });
    expect(unauthorized.status).toBe(401);

    const authorized = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-based-signature": signature
      },
      body: payload
    });
    expect(authorized.status).toBe(200);
  });
});
