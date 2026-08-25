# Template spec — Original Boring But Big

Source: *5/3/1 Forever*, Boring But Big chapter. Paraphrased for personal use.
This is the hand-verification reference for the `original-bbb` template record
and its fixture test.

---

## Identity and constraints

| Field | Value |
|---|---|
| `id` | `original-bbb` |
| Role eligibility | **Leader only** — the book states BBB is always a Leader template |
| Supported day counts | 3 or 4 |
| TM percentage | 0.85 default, 0.90 permitted — 85% for most lifters, 90% for beginners |
| Cycles as Leader | 2 or 3, so compatible with the 2+1, 2+2 and 3+2 models |

### Compatible anchors

The book names these explicitly as templates that may follow BBB:

- 5's Progression, Jokers and First Set Last
- PR Set and First Set Last
- PR Set, Jokers and First Set Last
- 5/3/1 and Widowmakers
- 5's Progression and First Set Last
- Full Body, 5's PRO
- Full Body, PR Set
- Beyond, FSL
- Original 5/3/1

None of these exist yet, so the list is unusable until a second template lands.
Write the field anyway.

## Session shape

**Four days** — one main lift per session, in the order squat, bench, deadlift,
press. The book notes that which day you train and which lift falls on it is
freely adjustable.

**Three days** — an alternating schedule that does not repeat weekly. Week one
is squat, bench, deadlift; week two is press, squat, bench; week three is
deadlift, press, squat. This means **a lift's position in the week is a
function of the week index**, which the generator must handle — it is not a
fixed weekly pattern.

## Main work

⚠️ **Unresolved — do not write the fixture until this is settled.**

The printed table in the Original BBB section shows five reps on every set:

| Week 1 | Week 2 | Week 3 |
|---|---|---|
| 70% × 5 | 65% × 5 | 75% × 5 |
| 80% × 5 | 75% × 5 | 85% × 5 |
| 90% × 5 | 85% × 5 | 95% × 5 |

Two things about that table need confirming against the main 5/3/1 chapter:

1. **The week ordering is 3/5/1, not 5/3/1.** Standard 5/3/1 opens at
   65/75/85; this table opens at 70/80/90, which is the 3/5/1 arrangement. The
   Forever BBB section says outright that its examples use 3/5/1 programming
   and that you may substitute classic 5/3/1 if you prefer — but the Original
   BBB table carries no such note.
2. **Every set is five reps**, which is 5's PRO rather than 5/3/1 progression.
   Yet the day-layout tables in the same chapter label the main work simply
   "5/3/1 sets and reps."

So the source is ambiguous about whether Original BBB's main work is 5/3/1,
3/5/1, or 5's PRO — and the three produce different numbers. Resolve it from
the main 5/3/1 chapter before encoding anything, because this is precisely the
kind of discrepancy that puts a wrong weight on the screen.

## Supplemental work

- **5 sets of 10 reps** at a **single constant percentage of the training
  max** — this is what distinguishes Original from Forever BBB, where the
  percentage moves week to week.
- **Range 40–60%**, with 50–55% recommended.
- **The percentage is held constant per lift**, but may differ *between*
  lifts. The book notes that many lifters use a lower percentage for squat and
  deadlift, especially deadlift. So the supplemental percentage is a **per-lift
  value**, not a single template-level number.
- **The supplemental lift may be the opposite lift** — main work bench press,
  supplemental work press, for example. Original BBB permits this; Forever BBB
  explicitly does not. This is a user choice at setup.

## Assistance, per workout

| Category | Total reps |
|---|---|
| Push | 25–50 |
| Pull | 25–50 |
| Single leg / core | 0–50 |

Two qualifications worth surfacing in the UI: no lower-back work and very
little single-leg work during BBB — abdominal work is the recommendation for
that category. And assistance movements should be the less stressful options
(pushdowns and extensions rather than weighted dips).

## Jumps and throws

Ten total per workout, kept low-stress — box jumps and medicine ball throws
rather than bounding. Volume is deliberately reduced during BBB because
supplemental volume is high.

## Conditioning

- Hard: 2 days maximum, on training days only
- Easy: 3–5 days

## Setup options this template exposes

These are the `options` payload on the `program` row:

1. Supplemental percentage, 40–60%, **per lift**
2. Supplemental lift: same as main, or opposite
3. Training days: 3 or 4

## Deferred variations

Not shipping: Forever BBB (and Light), Full Body BBB, BBB FSL, Slightly Less
BBB, SLFBBB, and the BBB Challenge. Each becomes its own template record when
added. The Challenge additionally needs a supplemental percentage that varies
**by cycle** and a programming model with a fixed 3-cycle standalone phase —
neither exists yet.
