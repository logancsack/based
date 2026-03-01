import type { SourceLocation } from "./ast.js";

export class BasedSyntaxError extends Error {
  public readonly location: SourceLocation;

  public constructor(message: string, location: SourceLocation) {
    super(`${message} (line ${location.line}, col ${location.column})`);
    this.name = "BasedSyntaxError";
    this.location = location;
  }
}

export class BasedRuntimeError extends Error {
  public readonly location?: SourceLocation;

  public constructor(message: string, location?: SourceLocation) {
    super(location ? `${message} (line ${location.line}, col ${location.column})` : message);
    this.name = "BasedRuntimeError";
    this.location = location;
  }
}
