# Spec — Plan structure

Source: *5/3/1 Forever*, "Programming Your Training" and "The Deload/7th Week
Protocol" chapters. Paraphrased for personal use. This is the reference for
programming models, Leader/Anchor semantics, and 7th Week Protocol weeks.

---

## Part 1 — Programming your training

A plan runs **3, 4 or 5 cycles**. The newer the lifter, the longer the plan;
the more advanced, the shorter.

A plan is built from **two templates: a Leader and an Anchor.**

### The three programming models

| Model | Cycles | Book's guidance |
|---|---|---|
| 3 Leaders / 2 Anchors | 5 | Beginners, and people running the BBB or BBS challenges. Explicitly *not* recommended for most people |
| 2 Leaders / 2 Anchors | 4 | Beginner, Intermediate |
| 2 Leaders / 1 Anchor | 3 | Beginner, Intermediate, Advanced — recommended for just about every lifter and almost every program |

The 2+1 rationale is worth surfacing in the picker: two cycles is enough to
make and evaluate progress, and it verifies the training max is right for each
lift. Many programs are hard enough that a third cycle burns you out.

> **Note:** the app's fourth model, `beginner`, is **not in the book.** Beginner
> Prep School has no Leader/Anchor split and no timetable — it is repeated as
> long as it keeps working. Modelling it as a single-phase programming model is
> an app-level convenience, not a Wendler concept. Worth keeping straight when
> reconciling against the source.

### Leader vs Anchor — what actually differs

| | Leader | Anchor |
|---|---|---|
| Barbell volume | Higher, usually via supplemental work | Lower |
| Barbell intensity | — | Higher, or sets pushed harder |
| Assistance | Less | More |
| Jumps and throws | Fewer | More |
| Hard conditioning | Less | More |
| Easy conditioning | Emphasised | Also fine |
| Mobility / flexibility | Unchanged | Unchanged |

**This table is the justification for role-keyed prescription fields.** Four of
the six rows are template fields that vary by role. It is not a special case
for assistance — it is the general pattern, which supports the decision to let
any prescription field be role-keyed.

The book adds that these guidelines aren't absolute and some templates break
them.

## Part 2 — The 7th Week Protocol

Despite the name, it is not run every seventh week. It has **three uses**:
deload, training max test, and PR test.

### Placement rules

- **Between every Leader and Anchor phase: a deload.** Stated twice, without
  qualification.
- **Prior to starting new programming: a TM test or a PR test.**
- **Prior to any Leader template: a TM test week is recommended.** ⚠️ This
  means a plan may *open* with a 7th week, not only close with one — see the
  gaps section.
- **Optionally after any cycle**, at the lifter's discretion, especially for
  older lifters and taxing programs.

### The three variants

All three share the same warm-up percentages. **Only the reps differ.** Every
variant has **no supplemental work** and **limited assistance**.

| Variant | Sets |
|---|---|
| TM test | 70% × 5, 80% × 5, 90% × 5, 100% (TM) × 3–5 |
| Deload | 70% × 5, 80% × 3–5, 90% × 1, 100% (TM) × 1 |
| PR test | 70% × 5, 80% × 5, 90% × 5, 100% (TM) × PR or goal |

Note that 100% here means **100% of the training max**, not of the 1RM.

### Reading the TM test

The pass mark depends on the training max percentage in use:

- Training max set at **90%** → at least **3 reps**
- Training max set at **85%** → at least **5 reps**

This is a per-lift derivation, since the percentage can be overridden per lift.
The sets need not go to failure — hitting the rep target is sufficient, and the
reps should be strong and fast rather than a true 3RM or 5RM.

**Exceeding the target changes nothing.** More than five reps does not earn a
larger increase; progression stays at the normal 5 or 10 pounds. The book is
emphatic about this and calls treating the training max as a strength measure
one of the biggest beginner mistakes.

**Failing the test** — one or two reps at the training max — means lowering it:
run the estimated-max formula on what was managed and re-derive the training
max at the lift's own already-effective percentage (85–90%, from the Leader
template or a per-lift override). This has no dedicated UI of its own — it's
the same "enter maxes" flow used at any other time, just fed the test's
weight/reps; see PRD §1.9. Beginner has no 7th Week TM test framing in its
own progression section and uses the Stalled path instead.

### Session shape — independent of the template

The 7th Week Protocol has **its own day-count options**, which need not match
the template's:

| Days | Layout |
|---|---|
| 4 | Squat / Bench / Deadlift / Press, one per day |
| 3 | Squat, Bench, then Deadlift **and** Press together on the third day |
| 2 | Squat + Bench on day one, Deadlift + Press on day two |

Every session is warm-up/mobility, jumps/throws (10 total), the 7th week main
work, and assistance.

### Assistance and conditioning

| Category | Reps per workout |
|---|---|
| Push | 25–50 |
| Pull | 25–50 |
| Single leg / core | 25–50 |

Conditioning: 3–5 easy days. Hard conditioning is avoided unless the lifter
wants a conditioning test — this is the week to test a mile or a Prowler goal.

### On training maxes generally

Useful context for the setup flow's percentage step:

- The original program used **90%** of actual or estimated 1RM.
- With added supplemental volume and varied main-lift set/rep schemes, **85%**
  is often recommended.
- The author's gym starts people at **80–85%**; he targets **85–90%** for most
  lifters; a few strong lifters go as low as **77%**.
- **Some lifts need a different training max than others** once a lifter has a
  year or more in — which is the source justification for
  `tm_percentage_override`.
- Training maxes will need resetting frequently, especially press and bench.

## Part 3 — Warm-up sets

Before main work only — never before supplemental, and not a template
option. Every template runs the identical ramp:

| Set | Percentage | Reps |
|---|---|---|
| 1 | 40% | 5 |
| 2 | 50% | 5 |
| 3 | 60% | 3 |

Same basis as every other working weight — **percentage of the training
max**, not the 1RM, rounded the same way (docs/ARCHITECTURE.md §7). Computed
per lift, off that lift's own training max for the session it appears in —
the same training max its main work for that session uses.

**Applies before 7th Week Protocol sessions too.** The deload/TM
test/PR test's own 70/80/90% climb to the top set (Part 2's "three variants"
table above) is a different thing — the book's own "warm-up percentages" for
*that* table — and doesn't replace this ramp; a 7th Week Protocol session
still opens with 40/50/60% before its own main work, same as any other
session.

---

## Resolved

1. **A plan does not open with a 7th week.** It runs
   Leader → deload → Anchor → TM test. The book's recommendation of a TM test
   prior to a Leader is already served by the setup flow, which derives each
   training max from an entered actual or estimated 1RM — the same information
   a test week would produce.
2. **Each 7th Week Protocol occurrence has its own day-count choice,
   independent of either phase's and of each other** — corrected from an
   earlier, wrong reading of this as inherited from "the plan's
   training-days setting," and refined once more from a first correction
   that still shared one choice between the mid-plan deload and the closing
   TM test. The book states the 7th Week Protocol has three day-count
   options (two, three, or four) that can be picked regardless of what day
   count the surrounding Leader or Anchor phase runs — and the deload and
   the TM test are each their own occurrence, so a plan can run, say, a
   3-day deload and a 2-day closing TM test. Stored as
   `program.deload_training_days` and `program.tm_test_training_days`,
   columns separate from each other and from `leader_training_days`/
   `anchor_training_days` — see docs/ARCHITECTURE.md §3. The 7th week has
   its **own layout table keyed by day count**, independent of the
   template's session shape either way — at three days it puts deadlift and
   press together on the final day even for a template that is otherwise
   one lift per day.
3. **Two training days is allowed by the schema and freely selectable for
   the 7th Week Protocol**, even though no template's own session shape
   supports 2 days yet — the 7th Week Protocol's day count isn't limited by
   template availability the way the Leader's and Anchor's day-count pickers
   are, since it's an independent choice with its own complete layout table
   for 2, 3, and 4 days.
4. **The 40/50/60% warm-up ramp applies before every main-work session, 7th
   Week Protocol included** — the 7th week's own 70/80/90% climb to its top
   set is a separate thing the book itself calls "warm-up percentages" for
   that table specifically, not a substitute for the ramp every other
   session gets. Fixed across every template; not a template field.
5. **Assistance, jumps/throws, and the warm-up/mobility circuit are shown
   once per phase view, not once per session.** All three are per-workout
   fields the book prescribes identically across every session within one
   role (Leader, Anchor, or a 7th Week Protocol occurrence) — repeating them
   on every SessionCard would restate the same content on every one of a
   phase's sessions. The cheat sheet shows them once per calendar-week page
   instead (a page's sessions are always homogeneous in role/kind), keyed
   off `Session.assistance`/`jumpsOrThrows`/`warmupCircuit` rather than a
   new phase-level concept in the generator's own output.
6. **Joe DeFranco's "Agile 8" is the fallback warm-up/mobility circuit**
   wherever a role has no printed circuit of its own — the owner's own
   standing choice, not from the book. Applies to `bbb-original` and
   `original-531` (both declare an empty `warmup` for every role today) and
   to the 7th Week Protocol (which never has a printed circuit, independent
   of whichever template is running the surrounding phase, the same way its
   assistance and jumps/throws tables are independent of the template).

## Recorded, not gaps

7. **7th week weeks are structurally different**, not just differently
   weighted: no supplemental, limited assistance, own session layout. Confirms
   that a discriminated union of week kinds is required rather than optional.
8. **The PR test is excluded** by the decision to always close with a TM test.
   A deliberate simplification of the book, which permits either. Recorded so
   it isn't mistaken for an oversight.
9. **Optional deload after any cycle** is not modelled and shouldn't be — with
   no position tracking, an on-demand deload has nowhere to live.
