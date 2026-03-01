# Based Web Redesign Validation (2026-03-01)

## Build + Contract Checks

- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: pass
- `pnpm build:web`: pass
- `pnpm verify:web`: pass

## Route Smoke Checks (Local Preview)

- `/` -> `200`
- `/docs/` -> `200`
- `/playground/` -> `200`
- `/docs-md/quickstart.md` -> `200`
- `/llms.txt` -> `200`
- `/llms-full.txt` -> `200`

## Screenshot Set

Saved under `artifacts/screenshots`:

- `home-desktop.png`
- `docs-desktop.png`
- `playground-desktop.png`
- `404-desktop.png`
- `home-mobile.png`
- `docs-mobile.png`
- `playground-mobile.png`
- `404-mobile.png`

## Accessibility Checklist (Manual + Implementation Review)

- Keyboard navigation path on primary routes: pass (top nav, docs copy actions, playground run action).
- Visible focus indicators: pass (`:focus-visible` tokenized ring across controls).
- Contrast baseline for core text and buttons: pass against light theme palette.
- Semantic landmarks and heading order: pass (`header`, `main`, `aside`/`section`, `footer`, route-level `h1`/`h2` structure).
- Touch target baseline (`>= 40px`) for interactive controls: pass (`webui-btn` and nav links enforce min height).

## Notes

- Playground runtime behavior was preserved; only shell presentation was changed.
- Docs rendering now consumes `apps/docs/content/*.md` to keep HTML docs and `/docs-md`/`llms` artifacts aligned from one source.
