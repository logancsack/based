import type { SourceLocation } from "./ast.js";
import { BasedSyntaxError } from "./errors.js";

export interface LexedLine {
  line: number;
  depth: number;
  text: string;
}

export interface ExpressionToken {
  kind: "number" | "string" | "identifier" | "symbol";
  value: string;
  location: SourceLocation;
}

function stripInlineComments(line: string): string {
  let quote: '"' | "'" | null = null;
  let escaped = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (quote) {
      if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "#") {
      return line.slice(0, i).trimEnd();
    }

    if (char === "/" && next === "/") {
      return line.slice(0, i).trimEnd();
    }
  }

  return line.trimEnd();
}

export function lexLines(source: string): LexedLine[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const depthStyle = new Map<number, "spaces" | "tabs">();
  const output: LexedLine[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index] ?? "";
    const trimmed = stripInlineComments(raw);
    if (trimmed.trim().length === 0) {
      continue;
    }

    const indent = /^\s*/.exec(trimmed)?.[0] ?? "";
    const hasSpaces = indent.includes(" ");
    const hasTabs = indent.includes("\t");

    if (hasSpaces && hasTabs) {
      throw new BasedSyntaxError("Mixed tabs and spaces are not allowed on the same line", {
        line: index + 1,
        column: 1
      });
    }

    let normalizedSpaces = 0;
    for (const char of indent) {
      normalizedSpaces += char === "\t" ? 2 : 1;
    }

    if (normalizedSpaces % 2 !== 0) {
      throw new BasedSyntaxError("Indentation must resolve to 2-space units", {
        line: index + 1,
        column: 1
      });
    }

    const depth = normalizedSpaces / 2;
    if (hasSpaces || hasTabs) {
      const currentStyle: "spaces" | "tabs" = hasTabs ? "tabs" : "spaces";
      const knownStyle = depthStyle.get(depth);
      if (knownStyle && knownStyle !== currentStyle) {
        throw new BasedSyntaxError("Mixed indentation style at the same depth is not allowed", {
          line: index + 1,
          column: 1
        });
      }
      depthStyle.set(depth, currentStyle);
    }

    output.push({
      line: index + 1,
      depth,
      text: trimmed.slice(indent.length)
    });
  }

  return output;
}

function parseStringToken(source: string, start: number, line: number): { value: string; next: number } {
  const quote = source[start] as '"' | "'";
  let content = "";
  let index = start + 1;
  let escaped = false;

  while (index < source.length) {
    const char = source[index];
    if (escaped) {
      if (char === "n") {
        content += "\n";
      } else if (char === "t") {
        content += "\t";
      } else {
        content += char;
      }
      escaped = false;
      index += 1;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      index += 1;
      continue;
    }

    if (char === quote) {
      return { value: content, next: index + 1 };
    }

    content += char;
    index += 1;
  }

  throw new BasedSyntaxError("Unterminated string literal", { line, column: start + 1 });
}

export function tokenizeExpression(text: string, line: number): ExpressionToken[] {
  const tokens: ExpressionToken[] = [];
  let index = 0;

  while (index < text.length) {
    const char = text[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (char === '"' || char === "'") {
      const parsed = parseStringToken(text, index, line);
      tokens.push({
        kind: "string",
        value: parsed.value,
        location: { line, column: index + 1 }
      });
      index = parsed.next;
      continue;
    }

    if (/[0-9]/.test(char)) {
      const start = index;
      index += 1;
      while (index < text.length && /[0-9.]/.test(text[index])) {
        index += 1;
      }
      tokens.push({
        kind: "number",
        value: text.slice(start, index),
        location: { line, column: start + 1 }
      });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const start = index;
      index += 1;
      while (index < text.length && /[A-Za-z0-9_]/.test(text[index])) {
        index += 1;
      }
      tokens.push({
        kind: "identifier",
        value: text.slice(start, index),
        location: { line, column: start + 1 }
      });
      continue;
    }

    if ("()[]{}.,:+-*/".includes(char)) {
      tokens.push({
        kind: "symbol",
        value: char,
        location: { line, column: index + 1 }
      });
      index += 1;
      continue;
    }

    throw new BasedSyntaxError(`Unexpected token '${char}'`, { line, column: index + 1 });
  }

  return tokens;
}
