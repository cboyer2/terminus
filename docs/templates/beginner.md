# Template family — Beginner

Source: *5/3/1 Forever*, Beginner Prep School chapter. Paraphrased for personal
use.

`family: "Beginner"`

**One template: `beginner`.** Nothing in the chapter prints a second percentage
table, and nothing varies a setup-constraint field — day count, session shape,
role eligibility and cycle length are fixed throughout. Everything the chapter
offers as an alternative is an option on this one record.

---

## Identity and constraints

| Field | Value |
|---|---|
| `id` | `beginner` |
| Role eligibility | **Neither Leader nor Anchor** — valid only with the Beginner programming model |
| Supported day counts | **3 only** |
| TM percentage | 85–90%, **assigned per lift** — see the conflict note below |
| Compatible anchors | none |
| Cycles | 1 per plan, repeated indefinitely. The book states there is no timetable and to milk the program as long as possible |

## Session shape

Three days a week, two workouts alternating continuously:

- **Workout A** — Squat and Bench Press
- **Workout B** — Deadlift and Press

Because three sessions alternate across a two-workout rotation, the pattern
does not repeat weekly. Week one is A / B / A; week two is B / A / B.

**Two main lifts per session, each with its own supplemental work.** This is
not the one-lift-per-day shape.

## Main work and supplemental

Identical for both workouts:

| Week | Main sets | Supplemental |
|---|---|---|
| 1 | 70% × 5, 80% × 5, 90% × 5 | 5 × 5 @ 70% |
| 2 | 65% × 5, 75% × 5, 85% × 5 | 5 × 5 @ 65% |
| 3 | 75% × 5, 85% × 5, 95% × 5 | 5 × 5 @ 75% |

Three things to notice:

- **Main work is all fives** (5's PRO), in the **3/5/1 week ordering** — week
  one opens at 70%, not 65%. No PR sets.
- **Supplemental is First Set Last**, so its percentage is *derived from the
  main work's first set* and therefore **varies by week**.
- **Supplemental source varies per lift.** For the weaker lifts — the ones
  assigned an 85% training max — the book uses **Second Set Last** instead of
  First Set Last, same 5 × 5.

**Resolved:** the week percentages track **each workout's own progression**,
not the calendar week. Workout A lands on sessions 1, 3 and 5; Workout B on
sessions 2, 4 and 6. Each completes 70/80/90 → 65/75/85 → 75/85/95 exactly
once, so **a cycle is six sessions across two calendar weeks**.

Three things support this over the calendar reading: the book's schedule tables
stop at Week Two rather than showing a third; the calendar reading gives
Workout A five appearances to Workout B's four across three weeks, with A run
twice at identical loads in week one; and Original 5/3/1's A/B variation has
the same structure and is explicitly a two-week cycle.

## Setting the training max

Work up slowly in sets of five using 5–10% jumps, stopping on bar speed or
technical breakdown rather than a miss. Then apply the estimated-max formula
and take 85–90% of it.

**90% for the stronger lifts** — where the lifter is more experienced, though
still a beginner. **85% for lifts they struggle with** on weight or form, so
they can work lighter while correcting technique.

## Warm-up

A bodyweight circuit before every session, three times through:

- Jumping jacks — 3 × 25
- Bodyweight squat — 3 × 10
- Mountain climbers — 3 × 10 per leg

## Jumps

10–20 per workout: box jumps or standing long jumps. Total-body emphasis and a
strong landing. Depth jumps are explicitly not advised.

## Assistance

Four exercises per workout, 3–5 sets each, performed as a circuit five times
through, target 20 minutes.

| Exercise | Total reps |
|---|---|
| KB swing / KB snatch, or DB or bodyweight squat | 25–100 |
| Push-ups / dips | 25–100 |
| Chin-ups / pull-ups (inverted rows if unable) | 25–50 |
| Ab wheel / hanging leg raise | 25–50 |

Single-leg work substitutes at 5–10 reps, competence permitting.

## Running

Three times a week, one mile minimum and no more than three. Alternatively one
of these track sessions:

| Distance | Runs |
|---|---|
| 100 m | 10–16 |
| 200 m | 6–8 |
| 400 m | 4–6 |
| 800 m | 2–3 |

Prowler or sled substitutes for those who can't squat well.

## Progression

After each cycle, increase the training maxes. For lifters weak in a lift the
book offers three alternatives to the standard increment: **advance squat and
deadlift by five pounds rather than ten**, repeat a cycle unchanged, or repeat
using fractional plates.

## Stall

All five remedies begin identically — back up three cycles. What differs is the
programming on the way back up:

| # | Remedy | How it's expressed |
|---|---|---|
| 1 | Repeat as-is | default; nothing to change |
| 2 | Push the last set for a PR or goal, if technique is sound | **option** — PR-set flag on main work |
| 3 | Increase supplemental volume to 7–10 × 5 at FSL | **option** — supplemental set count |
| 4 | Switch to 5×5/3/1 | a **different template**, not yet written |
| 5 | Switch to SSL | **option** — supplemental source, already used by this template for the weaker lifts |

Only remedy 4 is blocked — it names a different template, not yet written.
Remedies 2, 3, and 5 are wired: all three options below are implemented in
the generator and exposed in the template picker.

## Options

| Option | Values | Default |
|---|---|---|
| Supplemental source, **per lift** | First Set Last · Second Set Last | derived from the lift's TM percentage — FSL at 90%, SSL at 85% |
| Supplemental set count | 5 × 5 · 7–10 × 5 | 5 × 5 |
| PR / goal set on the final main set | off · on | off |
| Squat and deadlift increment, **per lift** | 5 lb · 10 lb | 10 lb — the standard increment; 5 lb is the chapter's own alternative for a lift you're weak in, not a blanket default |

The supplemental source default is *derived* rather than fixed — the book ties
Second Set Last to the lifts running an 85% training max. Defaulting from the
percentage and letting it be overridden keeps that link without hard-coding it.

"Repeat a cycle unchanged," the chapter's other progression alternative, needs
no option: it is simply not adjusting the seed.

## Goals (reference only, not modelled)

Each main lift plus its supplemental in 15–18 minutes, both in 30–36 minutes;
assistance circuit in 20 minutes; able to run a mile; correct jumping and
landing.
