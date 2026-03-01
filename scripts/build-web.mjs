import { spawn } from "node:child_process";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const docsDir = path.join(repoRoot, "apps", "docs");
const playgroundDir = path.join(repoRoot, "apps", "playground");
const siteDir = path.join(repoRoot, "apps", "site");
const docsDist = path.join(docsDir, "dist");
const playgroundDist = path.join(playgroundDir, "dist");
const siteDist = path.join(siteDir, "dist");
const docsContentDir = path.join(docsDir, "content");

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === "win32";
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: { ...process.env, ...(options.env ?? {}) },
      stdio: "inherit",
      shell: isWin
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed: ${command} ${args.join(" ")} (exit ${code ?? -1})`));
      }
    });
  });
}

function parseFrontmatter(raw, filePath) {
  if (!raw.startsWith("---\n")) {
    throw new Error(`Missing frontmatter: ${filePath}`);
  }

  const end = raw.indexOf("\n---\n");
  if (end === -1) {
    throw new Error(`Unterminated frontmatter: ${filePath}`);
  }

  const header = raw.slice(4, end).trim();
  const body = raw.slice(end + 5).trim();
  const metadata = {};

  for (const line of header.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new Error(`Invalid frontmatter line '${line}' in ${filePath}`);
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    metadata[key] = value;
  }

  for (const key of ["slug", "title", "description", "order"]) {
    if (!metadata[key]) {
      throw new Error(`Missing '${key}' in ${filePath}`);
    }
  }

  const order = Number(metadata.order);
  if (!Number.isFinite(order)) {
    throw new Error(`Invalid numeric 'order' in ${filePath}`);
  }

  return {
    slug: metadata.slug,
    title: metadata.title,
    description: metadata.description,
    order,
    body
  };
}

async function readDocsMarkdownPages() {
  const entries = await readdir(docsContentDir, { withFileTypes: true });
  const pages = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) {
      continue;
    }
    const fullPath = path.join(docsContentDir, entry.name);
    const raw = await readFile(fullPath, "utf8");
    const parsed = parseFrontmatter(raw, fullPath);
    pages.push(parsed);
  }

  pages.sort((a, b) => a.order - b.order);
  const seenSlugs = new Set();
  for (const page of pages) {
    if (seenSlugs.has(page.slug)) {
      throw new Error(`Duplicate docs slug: ${page.slug}`);
    }
    seenSlugs.add(page.slug);
  }

  return pages;
}

async function writeAgentFiles(pages) {
  const docsMdDir = path.join(siteDist, "docs-md");
  await mkdir(docsMdDir, { recursive: true });

  for (const page of pages) {
    await writeFile(path.join(docsMdDir, `${page.slug}.md`), `${page.body}\n`, "utf8");
  }

  const llmsIndex = [
    "# Based LLM Index",
    "",
    "These markdown mirrors are optimized for AI/agent browsing.",
    "",
    ...pages.map(
      (page) => `- ${page.title}: https://based.vercel.app/docs-md/${page.slug}.md - ${page.description}`
    )
  ].join("\n");

  const llmsFull = [
    "# Based Documentation (Full Markdown)",
    "",
    ...pages.flatMap((page) => [
      `## ${page.title}`,
      `Source: /docs-md/${page.slug}.md`,
      "",
      page.body,
      ""
    ])
  ].join("\n");

  await writeFile(path.join(siteDist, "llms.txt"), `${llmsIndex}\n`, "utf8");
  await writeFile(path.join(siteDist, "llms-full.txt"), `${llmsFull}\n`, "utf8");
}

async function ensureDirExists(dirPath) {
  try {
    const info = await stat(dirPath);
    if (!info.isDirectory()) {
      throw new Error(`${dirPath} exists but is not a directory`);
    }
  } catch (error) {
    throw new Error(`Expected directory missing: ${dirPath}`, { cause: error });
  }
}

async function main() {
  await run("pnpm", ["--filter", "@based/lang-core", "build"]);
  await run("pnpm", ["--filter", "@based/docs", "exec", "vite", "build", "--base", "/docs/"]);
  await run("pnpm", ["--filter", "@based/playground", "exec", "vite", "build", "--base", "/playground/"]);
  await run("pnpm", ["--filter", "@based/site", "exec", "vite", "build", "--base", "/"]);

  await ensureDirExists(docsDist);
  await ensureDirExists(playgroundDist);
  await ensureDirExists(siteDist);

  await rm(path.join(siteDist, "docs"), { recursive: true, force: true });
  await rm(path.join(siteDist, "playground"), { recursive: true, force: true });
  await rm(path.join(siteDist, "docs-md"), { recursive: true, force: true });
  await rm(path.join(siteDist, "llms.txt"), { force: true });
  await rm(path.join(siteDist, "llms-full.txt"), { force: true });

  await cp(docsDist, path.join(siteDist, "docs"), { recursive: true });
  await cp(playgroundDist, path.join(siteDist, "playground"), { recursive: true });

  const pages = await readDocsMarkdownPages();
  await writeAgentFiles(pages);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
