# CLAUDE.md

@docs/ARCHITECTURE.md

See `docs/PRD.md` for scope reasoning and `docs/templates/` for template specs.
Read them when they're relevant; they aren't loaded by default.

## Project

**Terminus** — a 5/3/1 strength training planner. Single
user, personal tool, installed to the iPhone Home Screen as a PWA.

It turns training maxes plus a template into a programmed multi-cycle plan and
displays it as a quick reference. It plans; it does not log.

Minimal, calm, glanceable one-handed. Answers "what is my training plan?"

## Stack

- **Svelte + Vite + TypeScript** — static build, no native targets
- **vite-plugin-pwa** — manifest and service worker
- **localStorage** — all state, JSON-serialised. No backend, no accounts, no keys
- **GitHub Pages** from a public repo, deployed by GitHub Actions
- No router — three views behind a single `view` store
- Tests run from the terminal; the generator is testable without a UI

## Data model

Stored state is a single JSON blob in localStorage:

- **lifts** — each with a `trainingMaxSeed`, `increment`, stable `liftKey`,
  main/supplemental role, and a nullable `tmPercentageOverride`
- **program** — programming model, training days (2–4), leader template,
  anchor template (null for beginner), plan-wide `tmPercentage`, template options

The TM percentage is plan-wide, defaulted from the Leader template. A lift may
override it — per-lift is permitted, per-phase is not. The 1RM is not stored;
it is derivable as `seed ÷ effectivePercentage(lift)`.

Everything else — every cycle, session, set and weight — is **derived**. The
generator is a pure function of stored inputs. No plan is persisted.

There is no position, no date, no completion state, and no history.

## Naming

**TypeScript:** `camelCase` for variables and functions, `PascalCase` for types
and components, `UPPER_SNAKE_CASE` for constants. Svelte components
`PascalCase.svelte`; everything else `kebab-case.ts`.

**Domain terms are precise.** These are all numbers and must never be confused:

| Term | Meaning |
|---|---|
| `oneRepMax` | actual or estimated 1RM |
| `estimatedMax` | `weight × reps × 0.0333 + weight` |
| `trainingMaxSeed` | stored starting TM for a block |
| `trainingMax` | derived TM for a given cycle |
| `tmPercentage` | 0–1 (e.g. `0.85`), never 85 |
| `workingWeight` | computed, rounded, displayable |
| `increment` | per-cycle TM bump |

Never name anything bare `max`, `weight`, or `percent`.

**Units:** pounds only. Round to the nearest 5 lb, ties up.

## Architecture rules

- The generator imports **nothing** — no Svelte, no storage. Numbers in, numbers out.
- Templates are **composed**, not inherited. A template *has* a main-work
  scheme, a supplemental source, a session shape, and assistance targets.
- **Variation or option?** A variation is something the book prints a separate
  table for — its own template record. An option is a knob the book tells you
  to set — it lives in the options payload. Anything changing a setup
  constraint (role eligibility, day counts, TM percentage, compatible anchors,
  cycle length, session shape) is always a separate template.
- Any **prescription** field may be role-keyed (`leader` / `anchor` /
  `standalone`). **Setup-constraint fields never are** — and `tmPercentage` in
  particular must never vary by role; a per-lift override is fine.
- **Never branch on template ID.** The generator reads template records and
  nothing else; adding a template means adding a record. The temporary
  exception that applied while only one template existed has expired — if any
  such branch survives in the generator, removing it is part of the migration.
- Verify weights against a frozen fixture, not by inspection.

## How we work

- Ask before running state-changing commands — `git push`, `npm install`, deploys.
- Push back when an idea looks wrong. Say what's wrong and why.
- Ask clarifying questions before long answers rather than assuming.

## DO NOT

- **Do not add logging** — sets, reps, RPE, session notes, completion checkmarks.
  Not in v1, not ever.
- **Do not add history or progress tracking** — charts, trends, PR records,
  past-cycle archives.
- **Do not track dates or position** — no current-week marker, no calendar.
- **Do not persist a generated plan.** Derive it. A stale weight on screen is
  the worst possible bug.
- **Do not add a backend, accounts, or sync.** State is local.
- **Do not add a router.** Three views, one store.
- **Do not reintroduce native iOS**, Expo, React Native, or EAS.
- **Do not add an offline data cache or sync queue.** The service worker caches
  the app shell only.
- **Do not support other programs** — 5/3/1 only.
- **Do not add** rest timers, exercise videos, form checks, wearable
  integration, nutrition tracking, analytics, or monetization.
- **The repo is public.** Keep paraphrased book content out of it —
  `docs/templates/` is excluded for that reason.
- **Do not use deprecated npm packages.**
