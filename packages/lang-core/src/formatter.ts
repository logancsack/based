import type { Expression, Program, Statement } from "./ast.js";

const INDENT = "  ";

const PRECEDENCE: Record<string, number> = {
  twins: 1,
  beefing: 1,
  mogs: 1,
  flops: 1,
  "+": 2,
  "-": 2,
  "*": 3,
  "/": 3
};

function formatExpression(expression: Expression, parentPrecedence = 0): string {
  switch (expression.type) {
    case "LiteralExpression":
      if (typeof expression.value === "string") {
        return JSON.stringify(expression.value);
      }
      if (expression.value === true) {
        return "bet";
      }
      if (expression.value === false) {
        return "cap";
      }
      if (expression.value === null) {
        return "null";
      }
      return String(expression.value);
    case "IdentifierExpression":
      return expression.name;
    case "UnaryExpression":
      return `-${formatExpression(expression.argument, 4)}`;
    case "BinaryExpression": {
      const precedence = PRECEDENCE[expression.operator] ?? 0;
      const left = formatExpression(expression.left, precedence);
      const right = formatExpression(expression.right, precedence + 1);
      const rendered = `${left} ${expression.operator} ${right}`;
      return precedence < parentPrecedence ? `(${rendered})` : rendered;
    }
    case "ArrayExpression":
      return `[${expression.elements.map((element) => formatExpression(element)).join(", ")}]`;
    case "ObjectExpression":
      return `{${expression.entries.map((entry) => `${entry.key}: ${formatExpression(entry.value)}`).join(", ")}}`;
    case "MemberExpression":
      if (expression.computed) {
        return `${formatExpression(expression.object, 4)}[${formatExpression(expression.property as Expression)}]`;
      }
      return `${formatExpression(expression.object, 4)}.${expression.property as string}`;
    case "CallExpression": {
      const callee = formatExpression(expression.callee, 4);
      const args = expression.args.map((arg) => formatExpression(arg)).join(", ");
      if (expression.callee.type === "IdentifierExpression" && expression.args.length > 0) {
        return `${callee} ${args}`;
      }
      return `${callee}(${args})`;
    }
    default:
      return "";
  }
}

function formatBlock(statements: Statement[], depth: number): string {
  return statements.map((statement) => formatStatement(statement, depth)).join("\n");
}

function formatStatement(statement: Statement, depth: number): string {
  const pad = INDENT.repeat(depth);
  switch (statement.type) {
    case "VariableDeclaration":
      return `${pad}${statement.keyword} ${statement.name} is ${formatExpression(statement.value)}`;
    case "AssignmentStatement":
      return `${pad}${statement.name} is ${formatExpression(statement.value)}`;
    case "ExpressionStatement":
      return `${pad}${formatExpression(statement.expression)}`;
    case "IfStatement": {
      const thenPart = formatBlock(statement.thenBlock, depth + 1);
      if (!statement.elseBlock) {
        return `${pad}sus ${formatExpression(statement.condition)}\n${thenPart}`;
      }
      const elsePart = formatBlock(statement.elseBlock, depth + 1);
      return `${pad}sus ${formatExpression(statement.condition)}\n${thenPart}\n${pad}nah\n${elsePart}`;
    }
    case "WhileStatement":
      return `${pad}spam ${formatExpression(statement.condition)}\n${formatBlock(statement.body, depth + 1)}`;
    case "ForInStatement":
      return `${pad}binge ${statement.iterator} in ${formatExpression(statement.iterable)}\n${formatBlock(statement.body, depth + 1)}`;
    case "FunctionDeclaration": {
      const params = statement.params.join(", ");
      return `${pad}cook ${statement.name}(${params})\n${formatBlock(statement.body, depth + 1)}`;
    }
    case "ReturnStatement":
      return `${pad}${statement.value ? `secure ${formatExpression(statement.value)}` : "secure"}`;
    case "TryCatchStatement":
      return `${pad}sendit\n${formatBlock(statement.tryBlock, depth + 1)}\n${pad}fumbled ${statement.catchParam}\n${formatBlock(statement.catchBlock, depth + 1)}`;
    case "ImportStatement":
      return `${pad}yoink ${statement.names.join(", ")} outta ${statement.source}`;
    default:
      return pad;
  }
}

export function formatProgram(program: Program): string {
  return formatBlock(program.body, 0).trimEnd() + "\n";
}
