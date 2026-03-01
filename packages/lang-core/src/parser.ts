import type {
  AssignmentStatement,
  BinaryExpression,
  CallExpression,
  Expression,
  ForInStatement,
  FunctionDeclaration,
  IfStatement,
  ImportStatement,
  ObjectExpression,
  Program,
  ReturnStatement,
  Statement,
  TryCatchStatement,
  VariableDeclaration,
  WhileStatement
} from "./ast.js";
import type { ExpressionToken, LexedLine } from "./lexer.js";
import { lexLines, tokenizeExpression } from "./lexer.js";
import { BasedSyntaxError } from "./errors.js";

const BINARY_PRECEDENCE: Record<BinaryExpression["operator"], number> = {
  twins: 1,
  beefing: 1,
  mogs: 1,
  flops: 1,
  "+": 2,
  "-": 2,
  "*": 3,
  "/": 3
};

function toBinaryOperator(token: ExpressionToken): BinaryExpression["operator"] | null {
  if (token.kind === "symbol" && (token.value === "+" || token.value === "-" || token.value === "*" || token.value === "/")) {
    return token.value;
  }
  if (token.kind === "identifier") {
    if (token.value === "twins" || token.value === "beefing" || token.value === "mogs" || token.value === "flops") {
      return token.value;
    }
  }
  return null;
}

class ExpressionParser {
  private readonly tokens: ExpressionToken[];
  private position = 0;

  public constructor(tokens: ExpressionToken[]) {
    this.tokens = tokens;
  }

  public isDone(): boolean {
    return this.position >= this.tokens.length;
  }

  public current(): ExpressionToken | undefined {
    return this.tokens[this.position];
  }

  public consume(): ExpressionToken {
    const token = this.tokens[this.position];
    if (!token) {
      throw new BasedSyntaxError("Unexpected end of expression", { line: 1, column: 1 });
    }
    this.position += 1;
    return token;
  }

  public matchSymbol(symbol: string): boolean {
    const token = this.current();
    return token?.kind === "symbol" && token.value === symbol;
  }

  public parseExpression(minPrecedence = 0): Expression {
    let left = this.parseUnary();

    while (true) {
      const token = this.current();
      if (!token) {
        break;
      }

      const operator = toBinaryOperator(token);
      if (!operator) {
        break;
      }

      const precedence = BINARY_PRECEDENCE[operator];
      if (precedence < minPrecedence) {
        break;
      }

      this.consume();
      const right = this.parseExpression(precedence + 1);
      left = {
        type: "BinaryExpression",
        operator,
        left,
        right
      };
    }

    return left;
  }

  private parseUnary(): Expression {
    if (this.matchSymbol("-")) {
      this.consume();
      return {
        type: "UnaryExpression",
        operator: "-",
        argument: this.parseUnary()
      };
    }

    return this.parsePostfix(this.parsePrimary());
  }

  private parsePostfix(base: Expression): Expression {
    let currentExpression = base;

    while (!this.isDone()) {
      if (this.matchSymbol(".")) {
        this.consume();
        const property = this.consume();
        if (property.kind !== "identifier") {
          throw new BasedSyntaxError("Expected identifier after '.'", property.location);
        }
        currentExpression = {
          type: "MemberExpression",
          object: currentExpression,
          property: property.value,
          computed: false
        };
        continue;
      }

      if (this.matchSymbol("[")) {
        const open = this.consume();
        const property = this.parseExpression();
        if (!this.matchSymbol("]")) {
          throw new BasedSyntaxError("Expected closing ']'", open.location);
        }
        this.consume();
        currentExpression = {
          type: "MemberExpression",
          object: currentExpression,
          property,
          computed: true
        };
        continue;
      }

      if (this.matchSymbol("(")) {
        this.consume();
        const args: Expression[] = [];
        while (!this.matchSymbol(")")) {
          args.push(this.parseExpression());
          if (this.matchSymbol(",")) {
            this.consume();
          } else if (!this.matchSymbol(")")) {
            const token = this.current();
            throw new BasedSyntaxError("Expected ',' or ')' in argument list", token?.location ?? { line: 1, column: 1 });
          }
        }
        this.consume();
        currentExpression = {
          type: "CallExpression",
          callee: currentExpression,
          args
        };
        continue;
      }

      break;
    }

    return currentExpression;
  }

  private parsePrimary(): Expression {
    const token = this.consume();

    if (token.kind === "number") {
      return {
        type: "LiteralExpression",
        value: Number(token.value)
      };
    }

    if (token.kind === "string") {
      return {
        type: "LiteralExpression",
        value: token.value
      };
    }

    if (token.kind === "identifier") {
      if (token.value === "bet") {
        return { type: "LiteralExpression", value: true };
      }
      if (token.value === "cap") {
        return { type: "LiteralExpression", value: false };
      }
      if (token.value === "null") {
        return { type: "LiteralExpression", value: null };
      }
      return {
        type: "IdentifierExpression",
        name: token.value
      };
    }

    if (token.kind === "symbol" && token.value === "(") {
      const expression = this.parseExpression();
      if (!this.matchSymbol(")")) {
        throw new BasedSyntaxError("Expected closing ')'", token.location);
      }
      this.consume();
      return expression;
    }

    if (token.kind === "symbol" && token.value === "[") {
      const elements: Expression[] = [];
      while (!this.matchSymbol("]")) {
        elements.push(this.parseExpression());
        if (this.matchSymbol(",")) {
          this.consume();
        } else if (!this.matchSymbol("]")) {
          const current = this.current();
          throw new BasedSyntaxError("Expected ',' or ']'", current?.location ?? token.location);
        }
      }
      this.consume();
      return {
        type: "ArrayExpression",
        elements
      };
    }

    if (token.kind === "symbol" && token.value === "{") {
      const entries: ObjectExpression["entries"] = [];
      while (!this.matchSymbol("}")) {
        const keyToken = this.consume();
        if (keyToken.kind !== "identifier" && keyToken.kind !== "string") {
          throw new BasedSyntaxError("Object keys must be identifiers or strings", keyToken.location);
        }

        if (!this.matchSymbol(":")) {
          throw new BasedSyntaxError("Expected ':' after object key", keyToken.location);
        }
        this.consume();
        const value = this.parseExpression();
        entries.push({
          key: keyToken.value,
          value
        });
        if (this.matchSymbol(",")) {
          this.consume();
        } else if (!this.matchSymbol("}")) {
          const current = this.current();
          throw new BasedSyntaxError("Expected ',' or '}'", current?.location ?? keyToken.location);
        }
      }
      this.consume();
      return {
        type: "ObjectExpression",
        entries
      };
    }

    throw new BasedSyntaxError("Unexpected token in expression", token.location);
  }
}

function parseExpressionText(text: string, line: number): Expression {
  const parser = new ExpressionParser(tokenizeExpression(text, line));
  const expression = parser.parseExpression();
  if (!parser.isDone()) {
    const token = parser.current();
    throw new BasedSyntaxError("Unexpected trailing tokens in expression", token?.location ?? { line, column: 1 });
  }
  return expression;
}

function parseExpressionOrSpaceCall(text: string, line: number): Expression {
  const parser = new ExpressionParser(tokenizeExpression(text, line));
  const callee = parser.parseExpression();
  if (parser.isDone()) {
    return callee;
  }

  const args: Expression[] = [];
  while (!parser.isDone()) {
    if (parser.matchSymbol(",")) {
      parser.consume();
      continue;
    }
    args.push(parser.parseExpression());
    if (parser.matchSymbol(",")) {
      parser.consume();
    }
  }

  const call: CallExpression = {
    type: "CallExpression",
    callee,
    args
  };

  return call;
}

class StatementParser {
  private readonly lines: LexedLine[];
  private index = 0;

  public constructor(lines: LexedLine[]) {
    this.lines = lines;
  }

  public parseProgram(): Program {
    return {
      type: "Program",
      body: this.parseBlock(0)
    };
  }

  private peek(offset = 0): LexedLine | undefined {
    return this.lines[this.index + offset];
  }

  private consume(): LexedLine {
    const line = this.lines[this.index];
    if (!line) {
      throw new BasedSyntaxError("Unexpected end of input", { line: 1, column: 1 });
    }
    this.index += 1;
    return line;
  }

  private parseBlock(depth: number): Statement[] {
    const statements: Statement[] = [];
    while (this.index < this.lines.length) {
      const line = this.peek();
      if (!line) {
        break;
      }

      if (line.depth < depth) {
        break;
      }
      if (line.depth > depth) {
        throw new BasedSyntaxError("Unexpected indentation", { line: line.line, column: 1 });
      }
      if (line.text === "nah" || line.text.startsWith("fumbled")) {
        break;
      }

      statements.push(this.parseStatement(depth));
    }
    return statements;
  }

  private parseChildBlock(parent: LexedLine, label: string): Statement[] {
    const next = this.peek();
    if (!next || next.depth <= parent.depth) {
      throw new BasedSyntaxError(`Expected indented block after '${label}'`, {
        line: parent.line,
        column: 1
      });
    }
    if (next.depth !== parent.depth + 1) {
      throw new BasedSyntaxError(`Block indentation after '${label}' must increase by one level`, {
        line: next.line,
        column: 1
      });
    }
    return this.parseBlock(parent.depth + 1);
  }

  private parseStatement(_depth: number): Statement {
    const line = this.consume();
    const location = { line: line.line, column: 1 };
    const text = line.text;

    if (text.startsWith("highkey ") || text.startsWith("lowkey ")) {
      const match = /^(highkey|lowkey)\s+([A-Za-z_][A-Za-z0-9_]*)\s+is\s+(.+)$/.exec(text);
      if (!match) {
        throw new BasedSyntaxError("Invalid variable declaration", location);
      }
      const statement: VariableDeclaration = {
        type: "VariableDeclaration",
        keyword: match[1] as "highkey" | "lowkey",
        name: match[2],
        value: parseExpressionText(match[3], line.line),
        location
      };
      return statement;
    }

    if (text.startsWith("sus ")) {
      const conditionText = text.slice("sus ".length).trim();
      if (conditionText.length === 0) {
        throw new BasedSyntaxError("Missing condition for 'sus'", location);
      }
      const thenBlock = this.parseChildBlock(line, "sus");
      let elseBlock: Statement[] | null = null;
      const elseLine = this.peek();
      if (elseLine && elseLine.depth === line.depth && elseLine.text === "nah") {
        this.consume();
        elseBlock = this.parseChildBlock(elseLine, "nah");
      }

      const statement: IfStatement = {
        type: "IfStatement",
        condition: parseExpressionText(conditionText, line.line),
        thenBlock,
        elseBlock,
        location
      };
      return statement;
    }

    if (text.startsWith("spam ")) {
      const condition = text.slice("spam ".length).trim();
      if (condition.length === 0) {
        throw new BasedSyntaxError("Missing condition for 'spam'", location);
      }
      const statement: WhileStatement = {
        type: "WhileStatement",
        condition: parseExpressionText(condition, line.line),
        body: this.parseChildBlock(line, "spam"),
        location
      };
      return statement;
    }

    if (text.startsWith("binge ")) {
      const match = /^binge\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+(.+)$/.exec(text);
      if (!match) {
        throw new BasedSyntaxError("Invalid binge loop syntax", location);
      }
      const statement: ForInStatement = {
        type: "ForInStatement",
        iterator: match[1],
        iterable: parseExpressionText(match[2], line.line),
        body: this.parseChildBlock(line, "binge"),
        location
      };
      return statement;
    }

    if (text.startsWith("cook ")) {
      const match = /^cook\s+([A-Za-z_][A-Za-z0-9_]*)\s*\((.*)\)$/.exec(text);
      if (!match) {
        throw new BasedSyntaxError("Invalid function declaration", location);
      }
      const rawParams = match[2].trim();
      const params = rawParams.length === 0 ? [] : rawParams.split(",").map((part) => part.trim());
      for (const param of params) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(param)) {
          throw new BasedSyntaxError(`Invalid parameter '${param}'`, location);
        }
      }
      const statement: FunctionDeclaration = {
        type: "FunctionDeclaration",
        name: match[1],
        params,
        body: this.parseChildBlock(line, "cook"),
        location
      };
      return statement;
    }

    if (text.startsWith("secure")) {
      const payload = text.slice("secure".length).trim();
      const statement: ReturnStatement = {
        type: "ReturnStatement",
        value: payload.length === 0 ? null : parseExpressionText(payload, line.line),
        location
      };
      return statement;
    }

    if (text === "sendit") {
      const tryBlock = this.parseChildBlock(line, "sendit");
      const catchLine = this.peek();
      if (!catchLine || catchLine.depth !== line.depth || !catchLine.text.startsWith("fumbled")) {
        throw new BasedSyntaxError("sendit must be followed by fumbled <name>", location);
      }
      this.consume();
      const catchMatch = /^fumbled(?:\s+([A-Za-z_][A-Za-z0-9_]*))?$/.exec(catchLine.text);
      if (!catchMatch) {
        throw new BasedSyntaxError("Invalid fumbled syntax", { line: catchLine.line, column: 1 });
      }
      const statement: TryCatchStatement = {
        type: "TryCatchStatement",
        tryBlock,
        catchParam: catchMatch[1] ?? "drama",
        catchBlock: this.parseChildBlock(catchLine, "fumbled"),
        location
      };
      return statement;
    }

    if (text.startsWith("yoink ")) {
      const match = /^yoink\s+(.+)\s+outta\s+(.+)$/.exec(text);
      if (!match) {
        throw new BasedSyntaxError("Invalid yoink syntax", location);
      }

      const names = match[1]
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      if (names.length === 0) {
        throw new BasedSyntaxError("yoink must include at least one symbol", location);
      }

      const source = match[2].trim().replace(/^['"]|['"]$/g, "");
      const statement: ImportStatement = {
        type: "ImportStatement",
        names,
        source,
        location
      };
      return statement;
    }

    const assignmentMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s+is\s+(.+)$/.exec(text);
    if (assignmentMatch) {
      const statement: AssignmentStatement = {
        type: "AssignmentStatement",
        name: assignmentMatch[1],
        value: parseExpressionText(assignmentMatch[2], line.line),
        location
      };
      return statement;
    }

    return {
      type: "ExpressionStatement",
      expression: parseExpressionOrSpaceCall(text, line.line),
      location
    };
  }
}

export function parseSource(source: string): Program {
  const lines = lexLines(source);
  const parser = new StatementParser(lines);
  return parser.parseProgram();
}
