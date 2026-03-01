import { createHmac, timingSafeEqual } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { runBasedFile } from "@based/stdlib";

export interface CreateBasedHandlerOptions {
  entryFile: string;
  secret?: string;
  allowlist?: string[];
  timeoutMs?: number;
  maxBodyBytes?: number;
}

async function readBody(request: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let total = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maxBytes) {
      throw new Error(`Payload exceeds ${maxBytes} bytes`);
    }
    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function verifySignature(rawBody: Buffer, secret: string, candidate: string | undefined): boolean {
  if (!candidate) {
    return false;
  }
  const digest = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(digest);
  const provided = Buffer.from(candidate);
  if (expected.length !== provided.length) {
    return false;
  }
  return timingSafeEqual(expected, provided);
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(JSON.stringify(payload));
}

export function createBasedHandler(options: CreateBasedHandlerOptions) {
  const timeoutMs = options.timeoutMs ?? 5_000;
  const maxBodyBytes = options.maxBodyBytes ?? 256 * 1024;

  return async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    if (request.method !== "POST") {
      sendJson(response, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    try {
      const raw = await readBody(request, maxBodyBytes);
      if (options.secret) {
        const header = request.headers["x-based-signature"];
        const signature = Array.isArray(header) ? header[0] : header;
        if (!verifySignature(raw, options.secret, signature)) {
          sendJson(response, 401, { ok: false, error: "Invalid signature" });
          return;
        }
      }

      const payload = raw.byteLength === 0 ? {} : JSON.parse(raw.toString("utf8"));
      const start = Date.now();

      const execution = runBasedFile(options.entryFile, {
        invokeEntrypoint: true,
        payload,
        allowlist: options.allowlist
      });
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Execution timed out")), timeoutMs);
      });

      const result = await Promise.race([execution, timeout]);
      sendJson(response, 200, {
        ok: true,
        result: result.lastValue,
        durationMs: Date.now() - start
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      const status = message.includes("Payload exceeds") ? 413 : message.includes("Unexpected token") ? 400 : 500;
      sendJson(response, status, {
        ok: false,
        error: message
      });
    }
  };
}
