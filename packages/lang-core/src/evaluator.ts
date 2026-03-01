import type {
  BinaryExpression,
  CallExpression,
  Expression,
  FunctionDeclaration,
  MemberExpression,
  Program,
  Statement
} from "./ast.js";
import { BasedRuntimeError } from "./errors.js";

interface StoredValue {
  value: unknown;
  constant: boolean;
}

class Scope {
  private readonly values = new Map<string, StoredValue>();
  private readonly parent: Scope | null;

  public constructor(parent: Scope | null) {
    this.parent = parent;
  }

  public declare(name: string, value: unknown, constant: boolean): void {
    if (this.values.has(name)) {
      throw new BasedRuntimeError(`'${name}' is already declared`);
    }
    this.values.set(name, { value, constant });
  }

  public assign(name: string, value: unknown): void {
    if (this.values.has(name)) {
      const current = this.values.get(name);
      if (!current) {
        throw new BasedRuntimeError(`Could not assign to '${name}'`);
      }
      if (current.constant) {
        throw new BasedRuntimeError(`Cannot reassign highkey '${name}'`);
      }
      current.value = value;
      this.values.set(name, current);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    throw new BasedRuntimeError(`'${name}' is not declared`);
  }

  public get(name: string): unknown {
    if (this.values.has(name)) {
      return this.values.get(name)?.value;
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new BasedRuntimeError(`'${name}' is not declared`);
  }

  public snapshot(): Record<string, unknown> {
    return Object.fromEntries(Array.from(this.values.entries()).map(([key, value]) => [key, value.value]));
  }
}

class ReturnSignal {
  public readonly value: unknown;

  public constructor(value: unknown) {
    this.value = value;
  }
}

interface UserFunctionValue {
  kind: "user-function";
  declaration: FunctionDeclaration;
  closure: Scope;
}

function isUserFunction(value: unknown): value is UserFunctionValue {
  return Boolean(value && typeof value === "object" && (value as UserFunctionValue).kind === "user-function");
}

export interface RuntimeIO {
  yap?: (value: unknown) => void;
}

export interface ModuleProvider {
  loadModule(source: string, fromPath: string | undefined): Promise<Record<string, unknown>>;
}

export interface ExecuteOptions {
  io?: RuntimeIO;
  moduleProvider?: ModuleProvider;
  globals?: Record<string, unknown>;
  filePath?: string;
  entrypoint?: {
    name: string;
    args: unknown[];
  };
}

export interface ExecuteResult {
  exports: Record<string, unknown>;
  lastValue: unknown;
}

function toIterable(value: unknown): Iterable<unknown> {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "string") {
    return value;
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }
  throw new BasedRuntimeError("binge requires an array, string, or object");
}

async function evaluateBinary(expression: BinaryExpression, scope: Scope, context: ExecuteOptions): Promise<unknown> {
  const left = await evaluateExpression(expression.left, scope, context);
  const right = await evaluateExpression(expression.right, scope, context);
  switch (expression.operator) {
    case "+":
      if (typeof left === "string" || typeof right === "string") {
        return `${left ?? ""}${right ?? ""}`;
      }
      return Number(left) + Number(right);
    case "-":
      return Number(left) - Number(right);
    case "*":
      return Number(left) * Number(right);
    case "/":
      return Number(left) / Number(right);
    case "twins":
      return left === right;
    case "beefing":
      return left !== right;
    case "mogs":
      return Number(left) > Number(right);
    case "flops":
      return Number(left) < Number(right);
    default:
      throw new BasedRuntimeError(`Unsupported binary operator '${expression.operator}'`);
  }
}

function readMember(object: unknown, property: string | number): unknown {
  if (object === null || object === undefined) {
    throw new BasedRuntimeError("Cannot access property on null/undefined");
  }

  if (typeof property === "string" && property === "aura") {
    if (typeof object === "string" || Array.isArray(object)) {
      return object.length;
    }
    if (typeof object === "object") {
      return Object.keys(object as Record<string, unknown>).length;
    }
  }

  if (Array.isArray(object) && typeof property === "string") {
    if (property === "cop") {
      return (...values: unknown[]) => object.push(...values);
    }
    if (property === "yeet") {
      return () => object.pop();
    }
  }

  const value = (object as Record<string | number, unknown>)[property];
  if (typeof value === "function") {
    return value.bind(object);
  }
  return value;
}

async function evaluateMemberWithReceiver(
  expression: MemberExpression,
  scope: Scope,
  context: ExecuteOptions
): Promise<{ receiver: unknown; value: unknown }> {
  const receiver = await evaluateExpression(expression.object, scope, context);
  const property =
    typeof expression.property === "string"
      ? expression.property
      : ((await evaluateExpression(expression.property, scope, context)) as string | number);
  const value = readMember(receiver, property);
  return { receiver, value };
}

async function evaluateCall(expression: CallExpression, scope: Scope, context: ExecuteOptions): Promise<unknown> {
  const args = await Promise.all(expression.args.map((arg) => evaluateExpression(arg, scope, context)));

  if (expression.callee.type === "MemberExpression") {
    const member = await evaluateMemberWithReceiver(expression.callee, scope, context);
    if (isUserFunction(member.value)) {
      return callUserFunction(member.value, args, context);
    }
    if (typeof member.value === "function") {
      return await member.value.apply(member.receiver, args);
    }
    throw new BasedRuntimeError("Tried to call a non-function member");
  }

  const callee = await evaluateExpression(expression.callee, scope, context);
  if (isUserFunction(callee)) {
    return callUserFunction(callee, args, context);
  }
  if (typeof callee === "function") {
    return await callee(...args);
  }

  throw new BasedRuntimeError("Tried to call a non-function value");
}

async function evaluateExpression(expression: Expression, scope: Scope, context: ExecuteOptions): Promise<unknown> {
  switch (expression.type) {
    case "LiteralExpression":
      return expression.value;
    case "IdentifierExpression":
      return scope.get(expression.name);
    case "UnaryExpression":
      return -Number(await evaluateExpression(expression.argument, scope, context));
    case "BinaryExpression":
      return evaluateBinary(expression, scope, context);
    case "ArrayExpression":
      return Promise.all(expression.elements.map((element) => evaluateExpression(element, scope, context)));
    case "ObjectExpression": {
      const object: Record<string, unknown> = {};
      for (const entry of expression.entries) {
        object[entry.key] = await evaluateExpression(entry.value, scope, context);
      }
      return object;
    }
    case "MemberExpression": {
      const result = await evaluateMemberWithReceiver(expression, scope, context);
      return result.value;
    }
    case "CallExpression":
      return evaluateCall(expression, scope, context);
    default:
      throw new BasedRuntimeError(`Unsupported expression '${(expression as { type: string }).type}'`);
  }
}

async function callUserFunction(fn: UserFunctionValue, args: unknown[], context: ExecuteOptions): Promise<unknown> {
  const functionScope = new Scope(fn.closure);
  for (let i = 0; i < fn.declaration.params.length; i += 1) {
    functionScope.declare(fn.declaration.params[i], args[i], false);
  }

  try {
    await executeStatements(fn.declaration.body, functionScope, context);
    return null;
  } catch (error) {
    if (error instanceof ReturnSignal) {
      return error.value;
    }
    throw error;
  }
}

async function executeStatement(statement: Statement, scope: Scope, context: ExecuteOptions): Promise<unknown> {
  switch (statement.type) {
    case "VariableDeclaration": {
      const value = await evaluateExpression(statement.value, scope, context);
      scope.declare(statement.name, value, statement.keyword === "highkey");
      return value;
    }
    case "AssignmentStatement": {
      const value = await evaluateExpression(statement.value, scope, context);
      scope.assign(statement.name, value);
      return value;
    }
    case "ExpressionStatement":
      return evaluateExpression(statement.expression, scope, context);
    case "IfStatement": {
      const condition = await evaluateExpression(statement.condition, scope, context);
      if (condition) {
        return executeStatements(statement.thenBlock, new Scope(scope), context);
      }
      if (statement.elseBlock) {
        return executeStatements(statement.elseBlock, new Scope(scope), context);
      }
      return null;
    }
    case "WhileStatement": {
      let last: unknown = null;
      while (await evaluateExpression(statement.condition, scope, context)) {
        last = await executeStatements(statement.body, new Scope(scope), context);
      }
      return last;
    }
    case "ForInStatement": {
      const iterable = await evaluateExpression(statement.iterable, scope, context);
      let last: unknown = null;
      for (const item of toIterable(iterable)) {
        const loopScope = new Scope(scope);
        loopScope.declare(statement.iterator, item, false);
        last = await executeStatements(statement.body, loopScope, context);
      }
      return last;
    }
    case "FunctionDeclaration": {
      const fn: UserFunctionValue = {
        kind: "user-function",
        declaration: statement,
        closure: scope
      };
      scope.declare(statement.name, fn, true);
      return fn;
    }
    case "ReturnStatement": {
      const value = statement.value ? await evaluateExpression(statement.value, scope, context) : null;
      throw new ReturnSignal(value);
    }
    case "TryCatchStatement": {
      try {
        return await executeStatements(statement.tryBlock, new Scope(scope), context);
      } catch (error) {
        if (error instanceof ReturnSignal) {
          throw error;
        }
        const catchScope = new Scope(scope);
        catchScope.declare(statement.catchParam, error, false);
        return executeStatements(statement.catchBlock, catchScope, context);
      }
    }
    case "ImportStatement": {
      if (!context.moduleProvider) {
        throw new BasedRuntimeError("No module provider configured for yoink");
      }
      const loaded = await context.moduleProvider.loadModule(statement.source, context.filePath);
      for (const name of statement.names) {
        if (!(name in loaded)) {
          throw new BasedRuntimeError(`Module '${statement.source}' does not export '${name}'`, statement.location);
        }
        scope.declare(name, loaded[name], true);
      }
      return null;
    }
    default:
      throw new BasedRuntimeError(`Unsupported statement '${(statement as { type: string }).type}'`);
  }
}

async function executeStatements(statements: Statement[], scope: Scope, context: ExecuteOptions): Promise<unknown> {
  let lastValue: unknown = null;
  for (const statement of statements) {
    lastValue = await executeStatement(statement, scope, context);
  }
  return lastValue;
}

export async function executeProgram(program: Program, options: ExecuteOptions = {}): Promise<ExecuteResult> {
  const root = new Scope(null);

  root.declare(
    "yap",
    (value: unknown) => {
      if (options.io?.yap) {
        options.io.yap(value);
      } else {
        console.log(value);
      }
      return value;
    },
    true
  );

  for (const [key, value] of Object.entries(options.globals ?? {})) {
    root.declare(key, value, true);
  }

  let lastValue = await executeStatements(program.body, root, options);
  if (options.entrypoint) {
    const target = root.get(options.entrypoint.name);
    if (isUserFunction(target)) {
      lastValue = await callUserFunction(target, options.entrypoint.args, options);
    } else if (typeof target === "function") {
      lastValue = await target(...options.entrypoint.args);
    } else {
      throw new BasedRuntimeError(`Entrypoint '${options.entrypoint.name}' is not callable`);
    }
  }
  const exports = root.snapshot();
  delete exports.yap;
  return {
    exports,
    lastValue
  };
}
