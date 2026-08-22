# CLAUDE.md

@AGENTS.md

## Project

**Terminus** — a 5/3/1 strength training planner and cheat sheet.

It turns training maxes plus a template into a fully programmed multi-cycle plan and displays it as a quick reference. It plans; it does not log.

Design target: minimal, calm. One screen answers "what am I doing, at what weight."

## How we work

**The owner is learning to build apps. He writes the code; you do not.** This project's purpose is learning, so any code you write on his behalf is a loss, even when it would be faster.

- **Do not write and commit code for him.** Explain the approach, point at the relevant docs, and let him type it.
- **When asked how to do something, answer the question — don't do the thing.** "How do I wire up Supabase auth?" wants an explanation, not a finished `auth.ts`.
- **Ask before running anything that changes state** — `git commit`, `git push`, `supabase db push`, `npm install`, file writes.
- **If code is genuinely needed, write the smallest possible example** and explain what each part does. A snippet to learn from, not a file to accept.
- **Review, don't repair.** When his code is wrong, say what's wrong and why. Let him fix it.
- **Ask clarifying questions before detailed answers.** Assumptions produce plausible code built on the wrong premise.
- **Push back on his ideas when they're wrong.** Agreement he hasn't earned teaches him nothing.

## Stack

- **Expo** (React Native + React Native Web) — one codebase, web and iOS
- **TypeScript** — strict domain types
- **Supabase** — Postgres + Auth + row-level security
- Tests run from the terminal; the generator is testable without a UI

## Data model

Stored state is small and input-only:

- Lifts, each with a **training max seed** and a TM percentage
- A template ID
- A programming model (2+1, 2+2, 3+2)

Everything else — every cycle, week, set, and weight — is **derived**. The generator is a pure function of stored inputs. No plan is persisted.

There is no position, no date, no completion state, and no history.

## Naming conventions

**Postgres:** `snake_case`, plural table names, `user_id` foreign key on every row, RLS enabled on every table.

**TypeScript:** `camelCase` for variables and functions, `PascalCase` for types and components, `UPPER_SNAKE_CASE` for constants. Component files `PascalCase.tsx`; everything else `kebab-case.ts`.

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

**Units:** pounds only. Round working weights to the nearest 5 lb.

## APIs available

- **Supabase JS client** — auth and Postgres, all queries RLS-scoped by `user_id`
- **Expo SDK** — including `expo-router` for navigation
- **Local storage** — cache the derived plan for offline reads; secure storage for tokens

No third-party APIs. Ask before adding any dependency.

## Architecture rules

- The generator module imports **nothing** — no React, no Supabase, no storage. Numbers in, numbers out.
- Templates are **composed**. A template *has* a main-work scheme, a supplemental source, a session shape, and assistance targets. These vary independently.
- Branching on template ID **is allowed in v1** while only one template exists. Mark it with a comment saying it is deliberate and temporary.
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

