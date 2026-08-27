# CLAUDE.md

@AGENTS.md
@docs/PRD.md
@docs/ARCHITECTURE.md

Read the PRD for _why_ a decision was made and the architecture doc for _how_
it's structured. When they conflict with this file, this file wins.

## Project

**Terminus** — a 5/3/1 strength training planner and cheat sheet.

It turns training maxes plus a template into a fully programmed multi-cycle plan and displays it as a quick reference. It plans; it does not log.

Design target: minimal, calm. One screen answers "what am I doing, at what weight."

## How we work

- **Ask before running anything that changes state** — `git commit`, `git push`, `supabase db push`, `npm install`, file writes.
- **Ask clarifying questions before detailed answers.** Assumptions produce plausible code built on the wrong premise.
- **Push back on his ideas when they're wrong.** Agreement he hasn't earned teaches him nothing.

## Stack

- **Expo** (React Native + React Native Web) — one codebase, web and iOS
- **TypeScript** — strict domain types
- **Supabase** — Postgres + Auth + row-level security
- Tests run from the terminal; the generator is testable without a UI

## Data model

Stored state is small and input-only:

- **Lifts** — each with a `training_max_seed_lb`, an increment, a stable
  `lift_key`, a main/supplemental role, and a nullable
  `tm_percentage_override`.
- **Program** — one row: programming model, training days (2–4), leader
  template, anchor template (null for beginner), a **plan-wide** TM
  percentage, and a template-options payload.

The TM percentage is plan-wide, defaulted from the Leader template, and lives
on the program. A lift may override it (`override ?? program.tmPercentage`) —
**per-lift is permitted, per-phase is not.** The 1RM is not stored; it is an
entry-time input, derivable later as `seed ÷ effectivePercentage(lift)`.

Everything else — every cycle, week, set, and weight — is **derived**. The
generator is a pure function of stored inputs. No plan is persisted.

There is no position, no date, no completion state, and no history.

Template specs live in `docs/templates/` and are the hand-verification
reference for each template record and its fixture.

## Naming conventions

**Postgres:** `snake_case`, plural table names, `user_id` foreign key on every row, RLS enabled on every table.

**TypeScript:** `camelCase` for variables and functions, `PascalCase` for types and components, `UPPER_SNAKE_CASE` for constants. Component files `PascalCase.tsx`; everything else `kebab-case.ts`.

**Domain terms are precise.** These are all numbers and must never be confused:

| Term              | Meaning                           |
| ----------------- | --------------------------------- |
| `oneRepMax`       | actual or estimated 1RM           |
| `estimatedMax`    | `weight × reps × 0.0333 + weight` |
| `trainingMaxSeed` | stored starting TM for a block    |
| `trainingMax`     | derived TM for a given cycle      |
| `tmPercentage`    | 0–1 (e.g. `0.85`), never 85       |
| `workingWeight`   | computed, rounded, displayable    |
| `increment`       | per-cycle TM bump                 |

Never name anything bare `max`, `weight`, or `percent`.

**Units:** pounds only. Round working weights to the nearest 5 lb.

## APIs available

- **Supabase JS client** — auth and Postgres, all queries RLS-scoped by `user_id`
- **Expo SDK** — including `expo-router` for navigation
- **Local storage** — cache the derived plan for offline reads; secure storage for tokens

No third-party APIs. Ask before adding any dependency.

## Architecture rules

- The generator module imports **nothing** — no React, no Supabase, no storage. Numbers in, numbers out.
- Templates are **composed**, not inherited. A template *has* a main-work scheme, a supplemental source, a session shape, and assistance targets. These vary independently; inheritance will not model them.
- **Variation or option?** A variation is something the book prints a separate table for — it gets its own template record. An option is a knob the book tells you to set — it lives in the `options` payload. If it changes a setup-constraint field (role eligibility, day counts, TM percentage, compatible anchors, cycle length), it is always a separate template.
- Any **prescription** field on a template may be role-keyed (`leader` / `anchor` / `standalone`), resolved by one shared helper. **Setup-constraint fields never are** — and `tmPercentage` in particular must never vary by role — a per-lift override is
  fine, a per-phase one is not.
- Branching on template ID **is allowed while only one template exists**.
  Mark it with a comment saying it is deliberate and temporary. **The
  exception expires when the second template lands** — Original BBB is next,
  and it must be added by writing a template record, not by adding a branch.
- Verify weights against the source material with a frozen fixture test, not by inspection.

## DO NOT

- **Do not add logging in any form** — sets, reps, RPE, session notes, completion checkmarks.
- **Do not add history or progress tracking** — charts, trends, PR records, past-cycle archives.
- **Do not track dates or position** — no current-week marker, no calendar, no "today." The user navigates to the week themselves.
- **Do not persist a generated plan.** Derive it. A stale weight on screen is the worst possible bug.
- **Do not add multi-user features** — sharing, coach/athlete roles, permissions, invites, comments.
- **Do not support other programs** — 5/3/1 only.
- **Do not add** rest timers, exercise videos, form checks, wearable/HealthKit integration, nutrition or bodyweight tracking.
- **Do not reproduce book text verbatim.** Paraphrase; the source material is Jim Wendler's.
