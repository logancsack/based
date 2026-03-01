import { describe, expect, it } from "vitest";
import { BasedRuntimeError, BasedSyntaxError, parseSource, runSource } from "../src/index.js";

describe("lang-core parser", () => {
  it("parses full blueprint keywords", () => {
    const source = `
yoink network outta stdlib
highkey tax_rate is 0.2
lowkey age is 19
sus age flops 21
  age is age + 1
nah
  age is age - 1
spam age flops 22
  age is age + 1
binge user in ["a", "b"]
  yap user
cook get_data()
  secure bet
sendit
  yap "safe"
fumbled drama
  yap drama
`.trim();

    const program = parseSource(source);
    expect(program.body.length).toBeGreaterThan(0);
  });

  it("rejects mixed indentation style at same depth", () => {
    const source = "sus bet\n  lowkey x is 1\n\tlowkey y is 2";
    expect(() => parseSource(source)).toThrow(BasedSyntaxError);
  });
});

describe("lang-core evaluator", () => {
  it("runs entrypoint with payload", async () => {
    const source = `
cook main(payload)
  lowkey total is 0
  binge n in payload.values
    total is total + n
  secure total
`.trim();

    const result = await runSource(source, {
      entrypoint: {
        name: "main",
        args: [{ values: [1, 2, 3] }]
      }
    });

    expect(result.lastValue).toBe(6);
  });

  it("throws on highkey reassignment", async () => {
    const source = `
highkey vibe is 1
vibe is 2
`.trim();

    await expect(runSource(source)).rejects.toThrow(BasedRuntimeError);
  });

  it("supports sendit/fumbled runtime recovery", async () => {
    const source = `
lowkey recovered is cap
sendit
  missing_call()
fumbled drama
  recovered is bet
`.trim();

    const result = await runSource(source);
    expect(result.exports.recovered).toBe(true);
  });

  it("imports names from module provider", async () => {
    const source = `
yoink util outta stdlib
cook main(payload)
  secure util.add(payload.a, payload.b)
`.trim();

    const result = await runSource(source, {
      moduleProvider: {
        async loadModule(sourceName) {
          if (sourceName !== "stdlib") {
            return {};
          }
          return {
            util: {
              add(a: number, b: number) {
                return a + b;
              }
            }
          };
        }
      },
      entrypoint: {
        name: "main",
        args: [{ a: 2, b: 5 }]
      }
    });

    expect(result.lastValue).toBe(7);
  });
});
