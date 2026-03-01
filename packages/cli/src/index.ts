import { createServer } from "node:http";
import { access, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import open from "open";
import { checkSource, formatSource } from "@based/lang-core";
import { createBasedHandler } from "@based/server-kit";
import { runBasedFile } from "@based/stdlib";

const INVOCATION_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();

interface ParsedArgs {
  positional: string[];
  options: Record<string, string>;
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const options: Record<string, string> = {};

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const next = args[index + 1];
      if (next && !next.startsWith("--")) {
        options[key] = next;
        index += 1;
      } else {
        options[key] = "true";
      }
      continue;
    }
    positional.push(token);
  }

  return {
    positional,
    options
  };
}

function parseAllowlist(raw: string | undefined): string[] | undefined {
  if (!raw) {
    return undefined;
  }
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function parsePayload(raw: string | undefined): Promise<unknown> {
  if (!raw) {
    return null;
  }

  const resolved = path.resolve(INVOCATION_CWD, raw);
  try {
    await access(resolved);
    const content = await readFile(resolved, "utf8");
    return JSON.parse(content);
  } catch {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
}

function printHelp(): void {
  console.log(`Based CLI

Usage:
  based run <file.fr> [--payload <json-or-path>] [--allowlist <host,host>]
  based check <file.fr>
  based fmt <file.fr|glob>
  based serve --entry <file.fr> [--port 3000] [--secret <hmac-secret>] [--allowlist <host,host>]
  based docs
`);
}

async function runCommand(parsed: ParsedArgs): Promise<number> {
  const [command, ...rest] = parsed.positional;

  if (!command || command === "help" || command === "--help") {
    printHelp();
    return 0;
  }

  if (command === "run") {
    const file = rest[0];
    if (!file) {
      throw new Error("Missing script path. Usage: based run <file.fr>");
    }
    const payload = await parsePayload(parsed.options.payload);
    const result = await runBasedFile(path.resolve(INVOCATION_CWD, file), {
      invokeEntrypoint: true,
      payload,
      allowlist: parseAllowlist(parsed.options.allowlist)
    });
    console.log(typeof result.lastValue === "string" ? result.lastValue : JSON.stringify(result.lastValue, null, 2));
    return 0;
  }

  if (command === "check") {
    const file = rest[0];
    if (!file) {
      throw new Error("Missing script path. Usage: based check <file.fr>");
    }
    const source = await readFile(path.resolve(INVOCATION_CWD, file), "utf8");
    checkSource(source);
    console.log("check passed");
    return 0;
  }

  if (command === "fmt") {
    const target = rest[0];
    if (!target) {
      throw new Error("Missing path/glob. Usage: based fmt <file.fr|glob>");
    }

    const isGlob = /[*?[\]{}]/.test(target);
    const resolvedTarget = path.resolve(INVOCATION_CWD, target);
    let files: string[] = [];

    if (isGlob) {
      files = await fg(target, {
        onlyFiles: true,
        absolute: true
      });
    } else {
      const info = await stat(resolvedTarget);
      if (info.isDirectory()) {
        files = await fg("**/*.fr", {
          cwd: resolvedTarget,
          absolute: true
        });
      } else {
        files = [resolvedTarget];
      }
    }

    let changed = 0;
    for (const file of files) {
      if (!file.endsWith(".fr")) {
        continue;
      }
      const source = await readFile(file, "utf8");
      const formatted = formatSource(source);
      if (formatted !== source) {
        await writeFile(file, formatted, "utf8");
        changed += 1;
      }
    }

    console.log(`formatted ${changed} file(s)`);
    return 0;
  }

  if (command === "serve") {
    const entry = parsed.options.entry ?? rest[0];
    if (!entry) {
      throw new Error("Missing --entry <file.fr> for serve command");
    }
    const port = Number(parsed.options.port ?? "3000");
    if (!Number.isInteger(port) || port <= 0) {
      throw new Error("Invalid --port value");
    }

    const handler = createBasedHandler({
      entryFile: path.resolve(INVOCATION_CWD, entry),
      secret: parsed.options.secret,
      allowlist: parseAllowlist(parsed.options.allowlist)
    });
    const server = createServer((req, res) => {
      handler(req, res).catch((error) => {
        res.statusCode = 500;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : "Unknown error"
          })
        );
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(port, resolve);
    });

    console.log(`Based webhook server running on http://localhost:${port}`);
    return new Promise<number>(() => {
      // Keep process alive until manual stop.
    });
  }

  if (command === "docs") {
    const repoCandidate = path.resolve(INVOCATION_CWD, "apps/docs/index.html");
    const packageCandidate = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../apps/docs/index.html");

    let target: string | null = null;
    try {
      await access(repoCandidate);
      target = repoCandidate;
    } catch {
      try {
        await access(packageCandidate);
        target = packageCandidate;
      } catch {
        target = null;
      }
    }

    if (!target) {
      console.log("Docs site not found locally. See: https://github.com/your-org/based");
      return 0;
    }

    await open(target);
    console.log(`Opened docs: ${target}`);
    return 0;
  }

  throw new Error(`Unknown command '${command}'. Run 'based help' for usage.`);
}

export async function runCli(args: string[]): Promise<number> {
  const parsed = parseArgs(args);
  return runCommand(parsed);
}
