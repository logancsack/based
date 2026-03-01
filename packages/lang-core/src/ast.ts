export interface SourceLocation {
  line: number;
  column: number;
}

export interface Program {
  type: "Program";
  body: Statement[];
}

export type Statement =
  | VariableDeclaration
  | AssignmentStatement
  | ExpressionStatement
  | IfStatement
  | WhileStatement
  | ForInStatement
  | FunctionDeclaration
  | ReturnStatement
  | TryCatchStatement
  | ImportStatement;

export interface VariableDeclaration {
  type: "VariableDeclaration";
  keyword: "highkey" | "lowkey";
  name: string;
  value: Expression;
  location: SourceLocation;
}

export interface AssignmentStatement {
  type: "AssignmentStatement";
  name: string;
  value: Expression;
  location: SourceLocation;
}

export interface ExpressionStatement {
  type: "ExpressionStatement";
  expression: Expression;
  location: SourceLocation;
}

export interface IfStatement {
  type: "IfStatement";
  condition: Expression;
  thenBlock: Statement[];
  elseBlock: Statement[] | null;
  location: SourceLocation;
}

export interface WhileStatement {
  type: "WhileStatement";
  condition: Expression;
  body: Statement[];
  location: SourceLocation;
}

export interface ForInStatement {
  type: "ForInStatement";
  iterator: string;
  iterable: Expression;
  body: Statement[];
  location: SourceLocation;
}

export interface FunctionDeclaration {
  type: "FunctionDeclaration";
  name: string;
  params: string[];
  body: Statement[];
  location: SourceLocation;
}

export interface ReturnStatement {
  type: "ReturnStatement";
  value: Expression | null;
  location: SourceLocation;
}

export interface TryCatchStatement {
  type: "TryCatchStatement";
  tryBlock: Statement[];
  catchParam: string;
  catchBlock: Statement[];
  location: SourceLocation;
}

export interface ImportStatement {
  type: "ImportStatement";
  names: string[];
  source: string;
  location: SourceLocation;
}

export type Expression =
  | LiteralExpression
  | IdentifierExpression
  | BinaryExpression
  | UnaryExpression
  | CallExpression
  | MemberExpression
  | ArrayExpression
  | ObjectExpression;

export interface LiteralExpression {
  type: "LiteralExpression";
  value: string | number | boolean | null;
}

export interface IdentifierExpression {
  type: "IdentifierExpression";
  name: string;
}

export interface BinaryExpression {
  type: "BinaryExpression";
  operator: "+" | "-" | "*" | "/" | "twins" | "beefing" | "mogs" | "flops";
  left: Expression;
  right: Expression;
}

export interface UnaryExpression {
  type: "UnaryExpression";
  operator: "-";
  argument: Expression;
}

export interface CallExpression {
  type: "CallExpression";
  callee: Expression;
  args: Expression[];
}

export interface MemberExpression {
  type: "MemberExpression";
  object: Expression;
  property: string | Expression;
  computed: boolean;
}

export interface ArrayExpression {
  type: "ArrayExpression";
  elements: Expression[];
}

export interface ObjectExpression {
  type: "ObjectExpression";
  entries: Array<{ key: string; value: Expression }>;
}
