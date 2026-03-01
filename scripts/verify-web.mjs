import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const siteDist = path.join(repoRoot, "apps", "site", "dist");

const requiredPaths = [
  "index.html",
  "docs/index.html",
  "playground/index.html",
  "llms.txt",
  "llms-full.txt"
];

async function assertExists(relativePath) {
  const absolutePath = path.join(siteDist, relativePath);
  await access(absolutePath);
}

async function main() {
  for (const relativePath of requiredPaths) {
    await assertExists(relativePath);
  }

  const llmsIndex = await readFile(path.join(siteDist, "llms.txt"), "utf8");
  const llmsFull = await readFile(path.join(siteDist, "llms-full.txt"), "utf8");

  if (!llmsIndex.includes("https://based.vercel.app/docs-md/")) {
    throw new Error("llms.txt is missing docs-md links");
  }
  if (!llmsFull.includes("# Based Documentation (Full Markdown)")) {
    throw new Error("llms-full.txt is missing expected heading");
  }

  const docsMdDir = path.join(siteDist, "docs-md");
  await assertExists("docs-md");
  const files = await readdir(docsMdDir);
  const markdownFiles = files.filter((name) => name.endsWith(".md"));
  if (markdownFiles.length === 0) {
    throw new Error("docs-md directory has no markdown files");
  }

  console.log("verify:web passed");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
