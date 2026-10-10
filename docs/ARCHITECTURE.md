# Architecture — Terminus

Derived from `docs/PRD.md` and the constraints in `CLAUDE.md`.

---

## 1. Layering

```
              src/ (Svelte)
              views + stores
                /           \
               ↓             ↓
        storage/           generator/
   localStorage + export   pure functions + types
     (the only I/O)        (imports nothing)
```

This is a fan, not a stack. `src/` depends on both; nothing depends on `src/`.

`generator/` imports nothing — not Svelte, not storage. Values flow the other
way: a store reads seeds and template selection from `storage/` and passes them
**in as arguments**. The generator only ever knows the numbers it is handed.

`storage/` doesn't call the generator either. It reads and writes one JSON
blob. The one edge between them is that `storage/` may import types from
`generator/types.ts`, and that edge points one way only.

This is what makes "verify weights against a frozen fixture" possible without
spinning up a browser at all.

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

  The generator reads this record; it never branches on template name. The
  temporary exception that applied while only the Beginner template existed has
  expired.
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

A 7th Week Protocol deload is inserted between phases; the plan always closes
with a 7th Week TM test. A single-phase model therefore has no mid-plan
deload, which is why the Beginner model doesn't get one.

Modelling it this way means later additions — challenge programs that run a
fixed number of cycles with no Anchor, for instance — are data, not new
branches. The programming model is stored as an ID either way.

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

**7th week sessions do not use the template's session shape.** They have their
own layout keyed by training days alone — at three days, deadlift and press
share the final session even under a one-lift-per-day template. They also carry
no supplemental work and reduced assistance. A 7th week is therefore not "a
normal week at different percentages"; it is a different structure that happens
to use the same lifts. Full details in `docs/plan-structure.md`.

## 3. Data model

One JSON object in localStorage. Only inputs are stored — no plan, no position,
no dates.

```ts
type State = {
  lifts: Lift[]
  program: Program
}

type Lift = {
  liftKey: string              // 'squat' | 'bench' | 'press' | 'deadlift' | …
  role: 'main' | 'supplemental'
  trainingMaxSeed: number      // lb
  tmPercentageOverride: number | null   // overrides the program default
  increment: number            // lb, lift-level default; template may override
}

type Program = {
  programmingModel: 'beginner' | '2+1' | '2+2' | '3+2'
  trainingDays: 2 | 3 | 4
  leaderTemplateId: string
  anchorTemplateId: string | null       // null for the beginner model
  tmPercentage: number                  // plan-wide default, from the Leader
  options: Record<string, unknown>      // template-specific selections
}
```

- **`liftKey`, not a display name, is the identifier.** Templates refer to
  lifts by a stable key; free text would let "Bench Press" and "bench press"
  produce different plans.
- **The TM percentage is plan-wide, with a per-lift override.** The Leader
  template's value sets it and it carries through the Anchor unchanged. The
  Beginner chapter assigns 90% to stronger lifts and 85% to lifts the lifter
  struggles with, which is what the override is for.

  ```
  effectivePercentage(lift) = lift.tmPercentageOverride ?? program.tmPercentage
  ```

  **Per-lift is permitted; per-phase is not.** Varying the percentage between
  Leader and Anchor is the thing this design excludes.
- **The 1RM is not stored.** It is an entry-time input; the seed is computed
  from it and the 1RM discarded. Derivable as
  `seed ÷ effectivePercentage(lift)`, which after a few cycles is more current
  than the number originally typed.
- **Templates are code**, not data — `generator/templates/*.ts`. The library is
  curated, not user-authored. `program` records which templates are selected,
  not what they contain.

### Changing the percentage

Swapping the Leader for a template with a different percentage rescales rather
than recomputing:

```
newSeed = oldSeed × (newPercentage / oldPercentage)
```

This preserves accumulated progression while honouring the new template's
percentage. The same applies when the percentage is edited by hand.

## 4. `storage/` — the only I/O layer

```
storage/
  state.ts           load, save — one JSON blob in localStorage
  transfer.ts        exportJson, importJson — manual backup
  view-position.ts   last-viewed cycle + week page — view state, not State
```

All state is a single serialised object: lifts and program. A few hundred
bytes. There is no backend, no account, no key, and no `.env`.

**The risk this creates:** clearing site data destroys everything, with no
copy anywhere else. `transfer.ts` is the mitigation — an export that writes the
state to a file and an import that reads it back. Not sync, just a backup the
user triggers.

**View position is not state.** `view-position.ts` stores the cheat sheet's
last-viewed cycle number and week index under its own key, so an installed PWA
that iOS terminates in the background reopens on the same page. It records
what was on screen, not where the lifter is — it is excluded from export,
never reaches the generator, and holds indices only, never a weight. A saved
page that no longer exists in the plan falls back to the default.

**No offline data cache is needed** because there is no network. The service
worker caches the app shell so the installed PWA launches instantly, and that
is the whole of its job.

## 5. `src/` — Svelte views

A thin layer. No business logic — views read a store, hand the result to the
generator, render.

```
src/
  App.svelte
  views/
    CheatSheet.svelte   current cycle/session, computed weights
    Maxes.svelte        enter/edit lifts + estimated-max calculator
    Program.svelte      programming model, training days, template pickers
  stores/
    state.ts            wraps storage/, holds lifts + program
    plan.ts             derives the Plan from state via generator/cycles.ts
```

**No router.** Three views, no deep linking inside an installed PWA, so a
single `view` store replaces hash routing, the SPA fallback and the base-path
mismatch trap.

`plan.ts` is the seam: the only place composing stored inputs with the pure
generator to produce a `Plan`. Nothing else in `src/` imports from
`generator/` directly.

## 6. Testing

Since there's no logging or state machine to test, the test surface is
almost entirely the generator:

- **Fixture tests**: hand-check a few real cycles against the book
  (Beginner template, known seeds) and freeze the expected output. This is
  the test named explicitly in `CLAUDE.md` — "not by inspection."
- **Property-style checks** worth having later: adjusting one lift's seed
  changes only that lift's numbers (PRD §1.6 is literally asserting this).
- `storage/` needs one round-trip test: save then load then export then import
  returns the same state. It is the only place data loss can originate.
- `src/` needs nothing beyond type-checking — there's no logic there to break.

## 7. Rounding — settled

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

- **Session shape is under-modelled.** It currently covers one lift per day.
  It also needs: lifts whose day position depends on the week index (3-day
  BBB's rotation), two main lifts in one session (Full Body BBB, Original
  5/3/1 A/B), and a main-work scheme that differs between sessions within the
  same week (Original 5/3/1 A/B runs 3×5, 3×5, 3×3 in week one before
  switching to 5/3/1). This is the most likely thing to break.
- **Main work needs per-set flags.** PR sets on some weeks only, goal-rep
  targets, "work up to the training max for a single." A percentage/rep table
  can't express these.
- **Conditional sets don't exist yet.** Jokers are performed only if the PR
  set went well — a set that may or may not happen has no representation.
- **Supplemental is untested.** BBB's flat percentage and Original 5/3/1's
  absence of supplemental work exercise none of the hard cases: percentage
  varying by week or cycle, per-lift percentages, supplemental on the opposite
  lift, or supplemental drawn from the main work's own first set.

**Consequence for build order:** let these types churn while they are only a
generator and a fixture. Build the schema, `calc.ts`, the Beginner template
and its fixture first. Do not build plan-view UI on a `Week` type that no
second template has yet tested.

## 9. Build and deploy

```
Svelte + Vite + TypeScript   static build
vite-plugin-pwa              manifest + service worker (Workbox)
GitHub Actions               build → GitHub Pages
```

**The base path is the thing that breaks.** A project site is served from
`/terminus/`, which must match Vite's `base` and the manifest's `start_url` and
`scope`. Mismatched, the service worker fails to register and the app silently
refuses to install. With no router there is nothing else to keep in sync.

**iOS install:** `display: standalone` in the manifest plus a 180×180
`apple-touch-icon`. Installation is Safari's Share → Add to Home Screen only —
there is no install prompt and no way to trigger one, so the first-run view
should say so.

**No environment variables.** No backend means no keys, no `.env`, no redirect
URLs. Nothing secret ships, which is what makes the public repo unremarkable.

**Native iOS is out of scope.** It was the sole reason for the original Expo
stack and the toolchain cost more than it returned.
