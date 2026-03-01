import type { ModuleProvider, RuntimeIO } from "@based/lang-core";
import { BasedRuntimeError, runSource } from "@based/lang-core";
import { readFile } from "node:fs/promises";
import path from "node:path";

export interface NetworkResult {
  status: number;
  headers: Record<string, string>;
  body: unknown;
  ok: boolean;
}

export interface StdlibOptions {
  env?: Record<string, string | undefined>;
  allowlist?: string[];
  fetchImpl?: typeof fetch;
}

export interface NodeRuntimeOptions extends StdlibOptions {
  io?: RuntimeIO;
  globals?: Record<string, unknown>;
}

function normalizeHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of headers.entries()) {
    out[key] = value;
  }
  return out;
}

function parseAllowlist(allowlist?: string[]): string[] {
  return (allowlist ?? []).map((item) => item.trim().toLowerCase()).filter(Boolean);
}

function assertAllowed(url: string, allowlist: string[]): void {
  if (allowlist.length === 0) {
    return;
  }
  const host = new URL(url).hostname.toLowerCase();
  const allowed = allowlist.some((entry) => host === entry || host.endsWith(`.${entry}`));
  if (!allowed) {
    throw new BasedRuntimeError(`network call blocked for host '${host}'`);
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function createNetworkModule(options: StdlibOptions): {
  get: (url: string, init?: RequestInit) => Promise<NetworkResult>;
  post: (url: string, payload: unknown, init?: RequestInit) => Promise<NetworkResult>;
} {
  const fetchImpl = options.fetchImpl ?? fetch;
  const allowlist = parseAllowlist(options.allowlist);

  const execute = async (url: string, init: RequestInit): Promise<NetworkResult> => {
    assertAllowed(url, allowlist);
    const response = await fetchImpl(url, init);
    return {
      status: response.status,
      headers: normalizeHeaders(response.headers),
      body: await parseBody(response),
      ok: response.ok
    };
  };

  return {
    async get(url, init = {}) {
      return execute(url, {
        ...init,
        method: "GET"
      });
    },
    async post(url, payload, init = {}) {
      const headers = new Headers(init.headers ?? {});
      let body: string;
      if (typeof payload === "string") {
        body = payload;
      } else {
        body = JSON.stringify(payload);
        if (!headers.has("content-type")) {
          headers.set("content-type", "application/json");
        }
      }

      return execute(url, {
        ...init,
        method: "POST",
        headers,
        body
      });
    }
  };
}

function createVaultModule(options: StdlibOptions): {
  get: (key: string) => string | null;
} {
  const env = options.env ?? (process.env as Record<string, string | undefined>);
  return {
    get(key: string): string | null {
      return env[key] ?? null;
    }
  };
}

export function createStdlib(options: StdlibOptions = {}): {
  network: ReturnType<typeof createNetworkModule>;
  vault: ReturnType<typeof createVaultModule>;
  discord: {
    send: (message: string, init?: { webhookUrl?: string; envKey?: string }) => Promise<NetworkResult>;
  };
  slack: {
    send: (message: string, init?: { webhookUrl?: string; envKey?: string }) => Promise<NetworkResult>;
  };
} {
  const network = createNetworkModule(options);
  const vault = createVaultModule(options);

  const discord = {
    async send(message: string, init: { webhookUrl?: string; envKey?: string } = {}): Promise<NetworkResult> {
      const url = init.webhookUrl ?? vault.get(init.envKey ?? "DISCORD_WEBHOOK_URL");
      if (!url) {
        throw new BasedRuntimeError("Missing Discord webhook URL (set DISCORD_WEBHOOK_URL)");
      }
      return network.post(url, { content: message });
    }
  };

  const slack = {
    async send(message: string, init: { webhookUrl?: string; envKey?: string } = {}): Promise<NetworkResult> {
      const url = init.webhookUrl ?? vault.get(init.envKey ?? "SLACK_WEBHOOK_URL");
      if (!url) {
        throw new BasedRuntimeError("Missing Slack webhook URL (set SLACK_WEBHOOK_URL)");
      }
      return network.post(url, { text: message });
    }
  };

  return {
    network,
    vault,
    discord,
    slack
  };
}

function resolveImportPath(source: string, fromPath: string | undefined): string {
  if (source.startsWith("./") || source.startsWith("../")) {
    const base = fromPath ? path.dirname(fromPath) : process.cwd();
    const resolved = path.resolve(base, source);
    if (path.extname(resolved) === "") {
      return `${resolved}.fr`;
    }
    return resolved;
  }

  if (path.isAbsolute(source)) {
    return path.extname(source) === "" ? `${source}.fr` : source;
  }

  throw new BasedRuntimeError(`Unsupported module import '${source}'. Use stdlib or relative paths.`);
}

export function createNodeModuleProvider(options: NodeRuntimeOptions = {}): ModuleProvider {
  const stdlib = createStdlib(options);
  const cache = new Map<string, Promise<Record<string, unknown>>>();

  const provider: ModuleProvider = {
    async loadModule(source: string, fromPath: string | undefined): Promise<Record<string, unknown>> {
      if (source === "stdlib") {
        return stdlib as unknown as Record<string, unknown>;
      }

      const resolved = resolveImportPath(source, fromPath);
      const existing = cache.get(resolved);
      if (existing) {
        return existing;
      }

      const pending = (async () => {
        const raw = await readFile(resolved, "utf8");
        const result = await runSource(raw, {
          filePath: resolved,
          moduleProvider: provider,
          io: options.io,
          globals: options.globals
        });
        return result.exports;
      })();

      cache.set(resolved, pending);
      return pending;
    }
  };

  return provider;
}

export interface RunBasedFileOptions extends NodeRuntimeOptions {
  entrypointName?: string;
  payload?: unknown;
  invokeEntrypoint?: boolean;
}

export async function runBasedFile(entryFile: string, options: RunBasedFileOptions = {}) {
  const resolved = path.resolve(entryFile);
  const source = await readFile(resolved, "utf8");
  const moduleProvider = createNodeModuleProvider(options);
  const invokeEntrypoint = options.invokeEntrypoint ?? false;
  return runSource(source, {
    filePath: resolved,
    moduleProvider,
    io: options.io,
    globals: options.globals,
    entrypoint: invokeEntrypoint
      ? {
          name: options.entrypointName ?? "main",
          args: [options.payload]
        }
      : undefined
  });
}
