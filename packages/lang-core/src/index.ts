export type * from "./ast.js";
export { BasedRuntimeError, BasedSyntaxError } from "./errors.js";
export { formatProgram } from "./formatter.js";
export { executeProgram } from "./evaluator.js";
export type { ExecuteOptions, ExecuteResult, ModuleProvider, RuntimeIO } from "./evaluator.js";
export { lexLines, tokenizeExpression } from "./lexer.js";
export { parseSource } from "./parser.js";

import type { ExecuteOptions, ExecuteResult } from "./evaluator.js";
import { executeProgram } from "./evaluator.js";
import { formatProgram } from "./formatter.js";
import { parseSource } from "./parser.js";

export function checkSource(source: string): void {
  parseSource(source);
}

export async function runSource(source: string, options: ExecuteOptions = {}): Promise<ExecuteResult> {
  const program = parseSource(source);
  return executeProgram(program, options);
}

export function formatSource(source: string): string {
  const program = parseSource(source);
  return formatProgram(program);
}
