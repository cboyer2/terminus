# Terminus

A 5/3/1 strength training planner. Single user, personal tool, installed to
the iPhone Home Screen as a PWA. It turns training maxes plus a template into
a programmed multi-cycle plan and displays it as a quick reference — it
plans; it does not log.

See `CLAUDE.md` for the full project rules and `docs/ARCHITECTURE.md` for the
design.

## Stack

Svelte + Vite + TypeScript, static build, no backend. All state lives in one
localStorage JSON blob. Deployed to GitHub Pages by GitHub Actions.

## Get started

```bash
npm install
npm run dev
```

## Other commands

```bash
npm test      # vitest — the generator's frozen fixtures + storage round-trip
npm run build # production build to dist/
npm run check # svelte-check (TypeScript)
```
