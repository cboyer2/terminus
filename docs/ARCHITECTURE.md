# Architecture — Terminus

Derived from `docs/PRD.md` and the constraints in `CLAUDE.md`. This is a design
reference, not an implementation.

---

## 1. Layering

```

              app/ (expo-router)
              screens + hooks
                /           \
               ↓             ↓
          data/            generator/
   Supabase + cache     pure functions + types
   (the only I/O)       (imports nothing)

```

This is a fan, not a stack. `app/` depends on both; nothing depends on `app/`.

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

- **Templates are data, not code.** A `Template` is a composed record with
  two groups of fields.

  **Prescription** — what the template makes you do:
  - main-work scheme (percentages and reps per week)
  - supplemental prescription (sets, reps, and where the weight comes from)
  - session shape
  - assistance targets (push / pull / single-leg-core rep ranges per workout)
  - jumps and throws (total reps per workout)
  - conditioning (maximum hard days, range of easy days)

  **Setup constraints** — what the pickers need:
  - **role eligibility** — Leader, Anchor, both, or neither. The Beginner
    template is *neither*, and is valid only with the Beginner programming
    model.
  - **compatible anchors** — on Leader-eligible templates, the set of Anchor
    templates that may follow it. The book specifies these per Leader rather
    than allowing any pairing, so this is a directed relation, not a symmetric
    one. Express it as a list of template IDs, or as a group tag if the lists
    start repeating across a family.
  - **supported day counts** — which of 2, 3, or 4 training days this
    template can be run on. This is what filters the template picker.
  - **TM percentage** — a fixed value or a range the user chooses from.

  The Anchor picker therefore shows the intersection of three filters: the
  Leader's compatible-anchor list, templates supporting the chosen day count,
  and Anchor role eligibility. Leader is always chosen first.

### Variation or option?

Templates in the book come in families with many named variations, and the
line between "a different template" and "a setting on this template" needs a
rule, or the library becomes inconsistent.

**The test: a variation is something the book prints a separate table for; an
option is a knob the book tells you to set.**

- Original BBB, Forever BBB, Slightly Less BBB, Original 5/3/1 10-rep,
  Original 5/3/1 A/B — each has its own printed table. **Separate templates.**
- BBB's 40–60% supplemental percentage, supplemental on the same or opposite
  lift, three or four training days — each is a choice the text asks you to
  make. **Options**, carried in the `options` payload.
- Original 5/3/1's assistance-volume variation — no new table, only different
  rep targets for Leader versus Anchor use. **Neither**: it is a role-keyed
  field on one template.

The underlying reason is that variations change what the pickers filter on. The
10-rep variation is Leader-only; the A/B variation is three days, two lifts per
session, and a two-week cycle. As options inside one record, `supportedDayCounts`
would become `[3, 4]` and role eligibility "both", with only certain
combinations legal — cross-field validation bolted onto a data model. As
separate records the filters simply work.

**Formally: if a variation changes any setup-constraint field — role
eligibility, supported day counts, TM percentage, compatible anchors, cycle
length, or session shape — it must be its own template. If it changes only
prescription fields, it may be an option.**

The printed-table test is the quick version and usually agrees. Where they
disagree, **the constraint test wins**: Forever BBB prints two percentage
tables but they differ in no constraint, so they are one template with an
intensity option.

Cycle length and session shape count as constraints even though the pickers
don't filter on them, because both are structural — they change what a session
or a cycle *is*, not merely what it contains.

**Day count alone never splits a template.** What matters is whether a
different day count changes the shape of a session. Original BBB runs one main
lift per session at both three and four days, so it is one template declaring
`supportedDayCounts: [3, 4]`. Original 5/3/1's A/B variation puts two main
lifts in a session and runs a two-week cycle, so it is a separate template. The
test: does the day count change what a session *contains*, or only *when*
sessions happen? Terminus tracks no dates, so "when" is nearly invisible to it.

Training days is also **not** an option in the `options` payload — it is a
plan-level setting chosen before templates are picked, and templates declare
compatibility through `supportedDayCounts`.

Templates also carry a **`family`** label — "Boring But Big", "Original 5/3/1"
— used only for grouping in the picker, so a library of forty records doesn't
present as forty flat entries.

### Role-keyed fields

**Any prescription field may hold either a plain value or a map keyed by
role** — `leader`, `anchor`, or `standalone`. One resolver reads it:

```ts
type ByRole<T> = T | { leader?: T; anchor?: T; standalone?: T; default: T }
```

This exists because the book's own answer to "how do I run Original 5/3/1 as
both a Leader and an Anchor" is *change the assistance volume* — higher for
the first two to three cycles, lower for the final two to three, with main
work, jumps/throws and conditioning unchanged. Modelling that as two
near-identical template records would duplicate everything to vary three
numbers.

The rule is uniform rather than restricted to assistance, because which fields
vary by role is not yet known from a library of two templates, and guessing
would bake in the wrong prediction.

**Setup-constraint fields are never role-keyed.** Role eligibility, compatible
anchors, and supported day counts are flat by definition. Most importantly:

> **`tmPercentage` is never role-keyed.** The training max percentage is
> plan-wide and driven by the Leader. Allowing it to vary by role is the
> per-phase percentage this design deliberately removed, reintroduced by
> another name.

**Review heuristic, not a type rule:** if most of a template's prescription
fields differ by role, it isn't one template with role-keyed fields — it's two
templates, and should be split.

  The generator reads this record; it never branches on template name —
  except the one deliberate, commented exception `CLAUDE.md` allows for v1's
  single Beginner template.
- **One shared calc module.** Rounding, TM-from-seed, percentage-to-weight —
  one function each, called everywhere. This is where the "hardcode math in
  only one place" rule lives.

**Session shape is a function of template *and* training days**, not a
template property alone. Two days means two main lifts per session; four
means one. The template declares which day counts it supports; the generator
maps lifts to sessions given the chosen count.

**A programming model is a list of phases, not an enum.** Each phase names a
template role and a cycle count:

```
beginner  → [{ standalone, 1 }]
2 + 1     → [{ leader, 2 }, { anchor, 1 }]
2 + 2     → [{ leader, 2 }, { anchor, 2 }]
3 + 2     → [{ leader, 3 }, { anchor, 2 }]
```

A 7th Week Protocol deload is inserted between phases; the plan always opens
and closes with a 7th Week TM test — the opening one at cycleIndex 0, the
exact training max the first phase's first cycle itself starts from, per the
book's recommendation of a TM test prior to any Leader template (docs/
plan-structure.md "Placement rules"). A single-phase model therefore has no
mid-plan deload, which is why the Beginner model doesn't get one, but it
still gets both TM tests like every other model.

Modelling it this way means later additions — challenge programs that run a
fixed number of cycles with no Anchor, for instance — are data, not new
branches. The `programming_model` column stores an ID either way.

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
`(lifts, program) => Plan`. Everything downstream — cheat
sheet screen, template browser — is a view over its output.

### A cycle is three progression steps per lift, not three calendar weeks

Every 5/3/1 cycle gives each lift three progression steps — the 5s, 3s and 1s
weeks, whatever the template calls them. How many *calendar* weeks that spans
falls out of the session shape:

- One main lift per day, four days → three calendar weeks
- Two main lifts per session on an A/B rotation → **two** calendar weeks, six
  sessions, each workout progressing on its own appearances rather than by
  calendar week

So `Week` is a poor name for the unit. The generator should count progression
steps per lift and let calendar grouping be a rendering concern.

**Consequence for the UI:** on an A/B template a single calendar week contains
lifts at *different* progression steps. The cheat sheet cannot assume "week two
means every lift is at week-two percentages." Since the app tracks no dates,
the safest presentation is an ordered list of sessions rather than a
calendar-week grid.

### Weeks are not all the same shape

A block contains normal training weeks _and_ 7th Week Protocol weeks, which
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

**7th week sessions do not use the template's session shape.** They have their
own layout keyed by training days alone — at three days, deadlift and press
share the final session even under a one-lift-per-day template. They also carry
no supplemental work and reduced assistance. A 7th week is therefore not "a
normal week at different percentages"; it is a different structure that happens
to use the same lifts. Full details in `docs/plan-structure.md`.

## 3. Data model (Postgres via Supabase)

Only inputs are stored — no plan, no position, no dates, per §4 of the PRD.

```
lifts
  id                      uuid, pk
  user_id                 uuid, fk → auth.users
  lift_key                text, constrained to a known set ('squat', 'bench',
                          'press', 'deadlift', 'front_squat', …)
  role                    text, 'main' | 'supplemental'
  training_max_seed_lb    numeric
  tm_percentage_override  numeric, 0–1, nullable — overrides the program
                          default for this lift only
  increment_lb            numeric, set once at lift creation from the
                          standard lift-level default, editable per lift
  unique (user_id, lift_key)

program
  user_id                uuid, pk — one row per user, and that is the point
  programming_model      text, 'beginner' | '2+1' | '2+2' | '3+2'
  leader_training_days   int, check between 2 and 4 — also the standalone
                         template's day count for the beginner model
  anchor_training_days   int, check between 2 and 4, null for the beginner
                         model — chosen independently of leader_training_days
  deload_training_days   int, check between 2 and 4, null for the beginner
                         model (no phase transition, so no deload) —
                         independent of every other day-count column
  tm_test_training_days  int, check between 2 and 4 — independent of every
                         other day-count column; always set, since every
                         plan closes with one
  leader_template_id     text
  anchor_template_id     text, null for the beginner model
  tm_percentage          numeric, 0–1 — plan-wide default, from the Leader
  options                jsonb, template-specific optional selections
```

Six things worth noting about that shape:

- **Training days is four independent choices, not one.** The book allows a
  Leader and an Anchor to run at different day counts — Original 5/3/1 A/B
  (three days) is explicitly meant to transition into the canonical Original
  5/3/1 (four days) as its Anchor — and separately lets each 7th Week
  Protocol occurrence (the mid-plan deload, the closing TM test) run at 2,
  3, or 4 days regardless of either phase's count or the other occurrence's.
  A single `training_days` column conflated all four into one value; each
  now has its own column, and `cycles.ts`'s `buildMainCycleSessions` picks
  `leader_training_days` or `anchor_training_days` based on which phase
  (`TemplateRole`) is being built, while `generatePlan` passes
  `deload_training_days` or `tm_test_training_days` into
  `buildSeventhWeekSessions` explicitly depending on which occurrence it's
  building — the function itself no longer reads either off `program`.

- **`lift_key`, not `name`, is the identifier.** Templates are code and must
  refer to lifts by a stable key; free-text names would let "Bench Press" and
  "bench press" silently produce different plans.
- **The TM percentage is plan-wide by default, with a per-lift override.**
  Each template declares a percentage or a range; the **Leader template's**
  value sets `program.tm_percentage`, and it carries through the Anchor
  unchanged. A lift may override it — the Beginner chapter assigns 90% to
  stronger lifts and 85% to lifts the lifter struggles with on weight or form,
  so they can work lighter while correcting technique.

  ```
  effectivePercentage(lift) = lift.tmPercentageOverride ?? program.tmPercentage
  ```

  **Per-lift is permitted; per-phase is not.** Varying the percentage between
  Leader and Anchor is the thing this design removed, and an override must
  never be used to reintroduce it.
- **The 1RM is not stored.** It is an entry-time convenience only — the seed
  is computed from it at setup and the 1RM discarded. It is derivable as
  `seed ÷ effectivePercentage(lift)`, and after a few cycles of progression
  that derived figure is more current than the number originally typed.
- **`role` and `increment_lb` exist because the generator needs them.**
  Unlike `tmPercentage`, the increment is not re-resolved against a template
  on every plan generation — `cycles.ts` reads `lift.increment` directly, a
  concrete value decided once, when the lift is first saved, from the same
  standard lift-level default regardless of template. Beginner additionally
  lets squat or deadlift be overridden down to 5 lb from the Templates tab,
  exactly like `tm_percentage_override` — the book's own alternative for a
  lift you're weak in (docs/templates/beginner.md "Progression"), not a
  different default for the template as a whole.
- **`program` is singular and keyed by `user_id`.** A plural table with its
  own `id` implies you can hold several, which is the door history walks back
  in through. One row, enforced by the schema.

### Changing the percentage

Swapping the Leader template for one with a different percentage does not
recompute the seed from a stored 1RM — there isn't one. It rescales:

```
newSeed = oldSeed × (newPercentage / oldPercentage)
```

This preserves whatever progression the seed has accumulated while honouring
the new template's intended percentage. The same arithmetic applies if the
percentage is edited by hand.

Templates themselves are **not** a table — they're code
(`generator/templates/*.ts`), since the library is curated, not user-authored
(an explicit non-goal in the PRD). `program` records *which* templates are
selected, not what they contain.

RLS: every row scoped by `auth.uid() = user_id` — one policy per table, not
per column. RLS is enabled in the same migration that creates each table,
never as a follow-up.

## 4. `data/` — the only I/O layer

```
data/
  supabase.ts        client init
  lifts.ts           getLifts, upsertLift  (verb-first, per convention)
  program.ts         getProgram, setProgram
  cache.ts           AsyncStorage-backed read cache for offline
```

**Reads offline:** `cache.ts` mirrors the last-fetched `lifts` +
`program` rows to AsyncStorage — not SecureStore, which is reserved
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
  template.tsx        template + programming model picker, template library
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

The function takes no rounding mode parameter. A parameter would move the
decision to every call site — the inconsistency that "one function, one rule"
exists to prevent — and would make a frozen fixture ambiguous about which
mode produced it. If rounding ever needs to vary by template, it varies as a
field on the `Template` record the generator reads, like every other axis.
Flexibility belongs in the data, not the signature.

This rule is baked into every frozen fixture. Changing it later means
re-verifying all of them against the book.

## 8. Known model gaps

The design is deliberately unfinished in places. These are expected to force
type changes as templates are added, and are listed so the churn is planned
rather than alarming.

- **Session shape is under-modelled.** It now covers one lift per day, fixed
  or week-rotation (`SessionShapeVariant`, resolved per training-day count —
  bbb-original's 3-day rotation, where a lift's day position and its own
  progression step both depend on the week index, not a shared one). Still
  needed: two main lifts in one session (Full Body BBB, Original 5/3/1 A/B),
  and a main-work scheme that differs between sessions within the same week
  (Original 5/3/1 A/B runs 3×5, 3×5, 3×3 in week one before switching to
  5/3/1). This is the most likely thing to break next.
- **Main work needs per-set flags.** PR sets on some weeks only, goal-rep
  targets, "work up to the training max for a single." A percentage/rep table
  can't express these.
- **Conditional sets don't exist yet.** Jokers are performed only if the PR
  set went well — a set that may or may not happen has no representation.
- **Supplemental still has one untested hard case.** BBB's flat percentage
  (now with per-lift percentage overrides and a program-wide opposite-lift
  toggle — see `supplementalBasisLiftKey` in `cycles.ts`) and Beginner's
  first/second-set-last sourcing are both fixture-tested. What's left:
  percentage that varies by week or cycle (Forever BBB, BBB Challenge) —
  blocked on those templates, not on `cycles.ts` itself.

**Consequence for build order:** let these types churn while they are only a
generator and a fixture. Build the schema, `calc.ts`, the Beginner template
and its fixture first. Do not build plan-view UI on a `Week` type that no
second template has yet tested.
