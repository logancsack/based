# Based

Based is a meme-first programming language that uses Gen Z slang syntax while staying executable and useful for local automation, webhooks, and social bots.

This release is intentionally cloud-free:
- local runtime and CLI
- local playground
- self-host webhook server kit
- full documentation site

## Monorepo Layout

- `packages/lang-core`: lexer, parser, AST, evaluator, formatter
- `packages/stdlib`: `network`, `discord`, `slack`, `vault`
- `packages/server-kit`: Node webhook adapter (`createBasedHandler`)
- `packages/cli`: npm package `based-lang`, binary `based`
- `apps/site`: marketing site (`/`)
- `apps/docs`: documentation site
- `apps/playground`: local browser playground (stdlib mocked)
- `examples`: runnable sample scripts

## Local Setup

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm build:web
pnpm verify:web
```

## CLI

```bash
based run <file.fr> [--payload <json-or-path>] [--allowlist <host,host>]
based check <file.fr>
based fmt <file.fr|glob>
based serve --entry <file.fr> [--port 3000] [--secret <hmac-secret>] [--allowlist <host,host>]
based docs
```

## Syntax Highlights

| Standard Concept | Based Syntax |
| --- | --- |
| const / let | `highkey` / `lowkey` |
| assignment | `is` |
| true / false | `bet` / `cap` |
| if / else | `sus` / `nah` |
| while / for-of | `spam` / `binge ... in` |
| function / return | `cook` / `secure` |
| try / catch | `sendit` / `fumbled drama` |
| import | `yoink ... outta ...` |
| print | `yap` |

## Example

```fr
yoink network outta stdlib

cook main(payload)
  lowkey res is network.get("https://httpbin.org/get")
  yap res.status
  secure { ok: bet, payload: payload, upstream: res.body }
```

## Docs and Playground

- Docs app: `pnpm dev:docs` then open the shown URL.
- Playground app: `pnpm dev:playground` then open the shown URL.
- From CLI: `based docs` opens local docs if available.

## Website Deployment (Single Vercel Project)

- Build command: `pnpm build:web`
- Output directory: `apps/site/dist`
- Routes:
  - `/` marketing
  - `/docs/` docs
  - `/playground/` playground
  - `/docs-md/*.md` markdown mirrors
  - `/llms.txt` and `/llms-full.txt` AI discovery files
- Vercel settings are defined in `vercel.json`.

## License

MIT
