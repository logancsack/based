import cookbookRaw from "../content/cookbook.md?raw";
import languageReferenceRaw from "../content/language-reference.md?raw";
import quickstartRaw from "../content/quickstart.md?raw";
import selfHostGuideRaw from "../content/self-host-guide.md?raw";
import stdlibReferenceRaw from "../content/stdlib-reference.md?raw";
import troubleshootingRaw from "../content/troubleshooting.md?raw";

export interface DocsSection {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  markdown: string;
}

interface ParsedPage {
  slug: string;
  title: string;
  description: string;
  order: number;
  body: string;
}

function parseFrontmatter(raw: string, sourceName: string): ParsedPage {
  if (!raw.startsWith("---\n")) {
    throw new Error(`Missing frontmatter in ${sourceName}`);
  }

  const frontmatterEnd = raw.indexOf("\n---\n");
  if (frontmatterEnd === -1) {
    throw new Error(`Unterminated frontmatter in ${sourceName}`);
  }

  const header = raw.slice(4, frontmatterEnd).trim();
  const body = raw.slice(frontmatterEnd + 5).trim();
  const metadata: Record<string, string> = {};

  for (const line of header.split("\n")) {
    const separator = line.indexOf(":");
    if (separator === -1) {
      throw new Error(`Invalid frontmatter line '${line}' in ${sourceName}`);
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    metadata[key] = value;
  }

  for (const key of ["slug", "title", "description", "order"]) {
    if (!metadata[key]) {
      throw new Error(`Missing '${key}' in ${sourceName}`);
    }
  }

  const order = Number(metadata.order);
  if (!Number.isFinite(order)) {
    throw new Error(`Invalid numeric order in ${sourceName}`);
  }

  const titleHeading = `# ${metadata.title}`;
  const normalizedBody = body.startsWith(titleHeading) ? body.slice(titleHeading.length).trimStart() : body;

  return {
    slug: metadata.slug,
    title: metadata.title,
    description: metadata.description,
    order,
    body: normalizedBody
  };
}

const sources = [
  { name: "quickstart.md", raw: quickstartRaw },
  { name: "language-reference.md", raw: languageReferenceRaw },
  { name: "stdlib-reference.md", raw: stdlibReferenceRaw },
  { name: "self-host-guide.md", raw: selfHostGuideRaw },
  { name: "cookbook.md", raw: cookbookRaw },
  { name: "troubleshooting.md", raw: troubleshootingRaw }
];

export const docsSections: DocsSection[] = sources
  .map((source) => parseFrontmatter(source.raw, source.name))
  .sort((a, b) => a.order - b.order)
  .map((page) => ({
    id: page.slug,
    slug: page.slug,
    title: page.title,
    description: page.description,
    order: page.order,
    markdown: page.body
  }));

