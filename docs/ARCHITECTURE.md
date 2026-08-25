# Architecture — Terminus

Derived from `docs/PRD.md` and the constraints in `CLAUDE.md`. This is a design
reference, not an implementation — the code gets typed by hand.

---

## 1. Layering

```
```
              app/ (expo-router)
              screens + hooks
                /           \
               ↓             ↓
          data/            generator/
   Supabase + cache     pure functions + types
   (the only I/O)       (imports nothing)
```
```

`generator/` imports nothing — not React, not Supabase, not storage, and not
`data/`. Values flow the other way: `use-plan.ts` reads seeds and template
selection from `data/` and passes them **in as arguments**. The generator
only ever knows about the numbers it is handed.

`data/` doesn't call the generator either. It returns rows. The one edge
between them is that `data/` may import types from `generator/types.ts`, and
that edge points one way only.

This is what makes "verify weights against a frozen fixture" possible without
spinning up Expo or Supabase at all.

## 2. `generator/` — the core

This is the module that earns the PRD's success criterion: "adding the
second template requires no changes to the plan generator." Two things make
that true:

- **Templates are data, not code.** A `Template` is a composed record:
  main-work scheme (percentages/reps per week), supplemental source (BBB,
  FSL, none, …), session shape (lift order, day count), and assistance
  targets (push/pull/single-leg-core rep targets). The generator reads this
  record; it never branches on template name — except the one deliberate,
  commented exception `CLAUDE.md` allows for v1's single Beginner template.
- **One shared calc module.** Rounding, TM-from-seed, percentage-to-weight —
  one function each, called everywhere. This is where the "hardcode math in
  only one place" rule lives.

Domain types live in `generator/types.ts` and everything imports them from
there. There is no separate `domain/` directory — it would add a hop without
adding a boundary.

Rough shape:

```
generator/
  types.ts          Lift, Template, ProgrammingModel, Week, PlannedSet, Plan
  calc.ts           estimatedMax, trainingMax, workingWeight (rounding lives here)
  cycles.ts         expands seeds + template + programming model → Plan
  seed-progression.ts   normal / failed-test / stall → next seed
  templates/
    beginner.ts      the one Template record that exists in v1
  __tests__/
    fixtures/        hand-checked weights from the book, frozen
    cycles.test.ts
```

`cycles.ts` is the one function the rest of the app calls:
`(lifts, template, programmingModel) => Plan`. Everything downstream — cheat
sheet screen, template browser — is a view over its output.

### Weeks are not all the same shape

A block contains normal training weeks *and* 7th Week Protocol weeks, which
have different set/rep structures and different meanings. Modelling them as
one `CycleWeek` type forces optional fields that are meaningless half the
time. Use a discriminated union:

```ts
type Week =
  | { kind: "main"; ... }      // standard 5/3/1 week
  | { kind: "deload"; ... }    // 7th week, between Leader and Anchor
  | { kind: "tmTest"; ... }    // 7th week, TM test
  | { kind: "prTest"; ... }    // 7th week, PR test
```

The payoff: the compiler forces every renderer to handle every week kind, so
a new week type can't silently render as blank.

## 3. Data model (Postgres via Supabase)

Only inputs are stored — no plan, no position, no dates, per §4 of the PRD.

```
lifts
  id                  uuid, pk
  user_id             uuid, fk → auth.users
  lift_key            text, constrained to a known set ('squat', 'bench',
                      'press', 'deadlift', 'front_squat', …)
  role                text, 'main' | 'supplemental'
  training_max_seed_lb  numeric
  tm_percentage       numeric, 0–1
  increment_lb        numeric, lift-level default (template may override)
  unique (user_id, lift_key)

active_program
  user_id             uuid, pk — one row per user, and that is the point
  template_id         text
  programming_model   text
```

Three things worth noting about that shape:

- **`lift_key`, not `name`, is the identifier.** Templates are code and must
  refer to lifts by a stable key; free-text names would let "Bench Press" and
  "bench press" silently produce different plans. Add a display `name` column
  only if you find you need one.
- **`role` and `increment_lb` exist because the generator needs them.** The
  increment lives on the template with a lift-level fallback underneath (PRD
  §1.6) — this column is that fallback.
- **`active_program` is singular and keyed by `user_id`.** A plural `plans`
  table with its own `id` implies you can hold several, which is the door
  history walks back in through. One row, enforced by the schema.

Templates themselves are **not** a table — they're code
(`generator/templates/*.ts`), since the library is curated, not user-authored
(an explicit non-goal in the PRD). `active_program` records *which* template
is selected, not what it contains.

RLS: every row scoped by `auth.uid() = user_id` — one policy per table, not
per column. RLS is enabled in the same migration that creates each table,
never as a follow-up.

## 4. `data/` — the only I/O layer

```
data/
  supabase.ts        client init
  lifts.ts           getLifts, upsertLift  (verb-first, per convention)
  program.ts         getActiveProgram, setActiveProgram
  cache.ts           AsyncStorage-backed read cache for offline
```

**Reads offline:** `cache.ts` mirrors the last-fetched `lifts` +
`active_program` rows to AsyncStorage — not SecureStore, which is reserved
for session tokens. On load the app renders from cache immediately, then
reconciles with a live fetch. Because the plan is derived, there is nothing
to reconcile for the plan itself; only seeds and template selection
round-trip.

**Writes offline:** writes require connectivity and fail loudly. No queue, no
optimistic local write, no background retry. Editing a seed is a deliberate
act performed a handful of times a year, almost never mid-session — a sync
queue would be more machinery than the problem deserves, and silent failure
is the one outcome worse than an error message.

## 5. `app/` — expo-router screens

A thin layer. No business logic — screens call a hook, hand the result to
the generator, render.

```
app/
  index.tsx           cheat sheet — current cycle/week, computed weights
  maxes.tsx           enter/edit lifts + estimated-max calculator
  templates.tsx        template + programming model picker, template library
hooks/
  use-lifts.ts        wraps data/lifts.ts + cache
  use-plan.ts         wraps data/program.ts, then calls generator/cycles.ts
```

`use-plan.ts` is the seam: it's the only place that composes stored inputs
(from `data/`) with the pure generator to produce a `Plan` for rendering.
Nothing else in `app/` should import from `generator/` directly except
through this hook — keeps the "one screen answers what am I doing"
requirement honest, since there's exactly one code path producing the
numbers on screen.

## 6. Testing

Since there's no logging or state machine to test, the test surface is
almost entirely the generator:

- **Fixture tests**: hand-check a few real cycles against the book
  (Beginner template, known seeds) and freeze the expected output. This is
  the test named explicitly in `CLAUDE.md` — "not by inspection."
- **Property-style checks** worth having later: adjusting one lift's seed
  changes only that lift's numbers (PRD §1.6 is literally asserting this).
- `data/` and `app/` don't need much beyond type-checking — there's no logic
  there to break.

## 7. Rounding

**Round to the nearest 5 lb.** One rule, one function, applied at every
rounding point — estimated max and working weight alike. This stays
consistent with the book's worked example, which computes 348 from 275×8 and
uses 350.

**Ties round up.** 242.5 becomes 245. `Math.round(x / 5) * 5` gives this
behaviour, but state it as an intended rule rather than leaving it as an
accident of the implementation — a fixture that disagrees is otherwise a long
hunt.

This rule is baked into every frozen fixture. Changing it later means
re-verifying all of them against the book.
