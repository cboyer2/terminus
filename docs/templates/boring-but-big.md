# Template family — Boring But Big

Source: *5/3/1 Forever*, Boring But Big chapter. Paraphrased for personal use.

`family: "Boring But Big"`

---

## What the family shares

Every template below inherits these unless it says otherwise.

| Field | Value |
|---|---|
| Role eligibility | **Leader only** — the book states BBB is always a Leader template |
| Supported day counts | 3 or 4 |
| TM percentage | 0.85 default, 0.90 permitted (85% for most lifters, 90% for beginners) |
| Cycles as Leader | 2 or 3 → compatible with 2+1, 2+2, 3+2 |
| Assistance, per workout | Push 25–50, Pull 25–50, Single leg/core 0–50 |
| Jumps and throws | 10 per workout, low-stress (box jumps, med ball) |
| Conditioning | 2 hard days maximum, 3–5 easy |

**Assistance qualifications worth surfacing in the UI:** no lower-back work,
very little single-leg work — abdominal work is the recommendation for that
category — and less stressful movement choices generally (pushdowns and
extensions rather than weighted dips).

### Compatible anchors

Named explicitly in the book as templates that may follow BBB:

5's Progression with Jokers and FSL · PR Set and FSL · PR Set with Jokers and
FSL · 5/3/1 and Widowmakers · 5's Progression and FSL · Full Body 5's PRO ·
Full Body PR Set · Beyond FSL · Original 5/3/1

### Session shape

**Four days** — one main lift per session: squat, bench, deadlift, press. Which
day holds which lift is freely adjustable.

**Three days** — an alternating schedule that does not repeat weekly. Week one
squat / bench / deadlift, week two press / squat / bench, week three deadlift /
press / squat, week four bench / deadlift / press. A lift's position depends
on the week index. The rotation is four calendar weeks, not three — each lift
sits out exactly one week in four, but still gets exactly three appearances
(one per progression step) by the time the rotation wraps. A lift's own
progression step advances on its own appearances, not the calendar week: e.g.
bench sits out week three, so its own third appearance (the 75/85/95 step)
falls on week four, not week three.

## Templates in this family

| ID | Distinguishing feature | Status |
|---|---|---|
| `bbb-original` | 5×10 at one constant percentage | **shipping** |
| `bbb-forever` | 5×10 at percentages that change by week | deferred |
| `bbb-slightly-less` | same schemes as Original/Forever BBB, 3×10 instead of 5×10, plus its own 1×10 ascending scheme | deferred |
| `bbb-fsl` | supplemental tracks the first work set; TM capped at 85% | deferred |
| `bbb-full-body` | two main lifts per session | deferred |
| `bbb-mixed` | BBB on two lifts, 5×5 FSL on the other two — one of Slightly Less BBB's named variations in the book, but its own template here since the scheme differs per lift, not just the set count | deferred |
| `bbb-challenge` | supplemental percentage changes by cycle; fixed at 3 cycles | deferred |

---

## `bbb-original` — Original Boring But Big

The variation most people run. One constant supplemental percentage.

### Main work

**Resolved: three selectable bases — this is an option, not a fixed
encoding.** Per the owner: BBB (excluding BBB Challenge, a separate beast —
see below) originated as supplemental work bolted onto the *original* 5/3/1
main work, and only later grew the dedicated all-fives tables this chapter
prints. That lineage holds up against the text: the "First Set Last" chapter
(p.58) pairs the same style of 5×5 supplemental with the *canonical* 5/3/1
scheme, PR set included, and says so directly — "As you've seen in a
variation of BBB and, later, in Boring But Strong, using your first set last
can be used in a variety of ways." So `bbb-original`'s main work is
selectable across three bases, not just the two all-fives orderings:

| Base | Week 1 | Week 2 | Week 3 |
|---|---|---|---|
| 3/5/1, all fives — this chapter's own worked example (p.50) | 70% × 5, 80% × 5, 90% × 5 | 65% × 5, 75% × 5, 85% × 5 | 75% × 5, 85% × 5, 95% × 5 |
| Classic, all fives — Slightly Less BBB's worked example (p.54); no `+` | 65% × 5, 75% × 5, 85% × 5 | 70% × 5, 80% × 5, 90% × 5 | 75% × 5, 85% × 5, 95% × 5 |
| 5/3/1 sets and reps, PR set — the canonical scheme, identical to `original-531` (docs/templates/original-531.md) | 65% × 5, 75% × 5, 85% × 5+ | 70% × 3, 80% × 3, 90% × 3+ | 75% × 5, 85% × 3, 95% × 1+ |

The first two remain all-fives with no PR set, exactly as before. The third
reintroduces the PR set on the final set of each week — **stale note
corrected:** `MainWorkSet.isPrSet` already exists and already carries this
for both `original-531` and this base (`bbb-original.ts`'s `prSet` scheme),
fixture-tested. No gap here.

**Excludes BBB Challenge.** That template is fixed to 5's Progression with no
PR set by its own definition (p.52: "We do not go for a PR on the final
set") and doesn't take this option — it stays a separate, narrower template
regardless of which base `bbb-original` uses.

### Supplemental

5 sets of 10 reps at a **single constant percentage of the training max**, held
constant per lift for the whole run. This is what separates Original from
Forever BBB.

### Options

| Option | Values | Notes |
|---|---|---|
| Main work base | 3/5/1 all-fives · classic all-fives · 5/3/1 sets and reps (PR set) | See "Main work" above. 3/5/1 all-fives is the default, matching the chapter's own worked example for both Original and Forever BBB |
| Supplemental percentage | 40–60%, **per lift** | 50–55% recommended. The book notes many lifters go lower for squat and especially deadlift |
| Supplemental lift | same as main · opposite | Original permits the opposite lift — bench main, press supplemental. Forever BBB does not |

**Corrected:** an earlier version of this doc also listed a "Supplemental set scheme" option here (5×10 · 3×10 · 1×10 ascending). Checked against the book (pp.49–50): Original BBB's own section never mentions 3 sets or an ascending scheme — it's 5×10 at one constant percentage, full stop. Both other schemes belong to `bbb-slightly-less` below.

Training days is **not** an option — it is a plan-level setting, and this
template's support for 3 and 4 days is declared by `supportedDayCounts`.

---

## `bbb-forever` — Forever BBB *(deferred)*

Supplemental percentage **changes week to week** rather than staying constant.

| | Week 1 | Week 2 | Week 3 |
|---|---|---|---|
| Main | 70/80/90 × 5 | 65/75/85 × 5 | 75/85/95 × 5 |
| Supplemental, standard | 5×10 @ 60% | 5×10 @ 50% | 5×10 @ 70% |
| Supplemental, conservative | 5×10 @ 50% | 5×10 @ 40% | 5×10 @ 60% |

The conservative option is for more advanced lifters, those with recovery
trouble, and anyone new to BBB. Supplemental work **must** use the same lift as
the main work — not an option here.

### Options

| Option | Values |
|---|---|
| Intensity | standard · conservative |
| Supplemental set count | 5×10 · 3×10 (the book's "Forever BBB Light") |

> **Note on the rule.** Two printed tables here, but they differ in no
> setup-constraint field — same role, days, TM percentage, anchors. So they are
> one template with an intensity option. This is the case where the
> printed-table shortcut and the formal constraint test disagree; **the
> constraint test wins.**

---

## `bbb-slightly-less` — Slightly Less Boring But Big *(deferred)*

Its own named section in the book (pp.54–56), not an option on `bbb-original`
or `bbb-forever` — modelled here as its own template even though its
mechanics overlap with both (per the owner: go by the book's own section
boundaries, overlap and all, rather than collapsing it into either sibling).
**An earlier version of this doc wrongly folded two of its schemes into
`bbb-original`'s Options table — corrected below.**

The book frames it as "for people who just don't have the time to do the
'normal' BBB. Or they have found out, from their own experience, that the
'5x10' protocol does not work for them." Three variations, all 3 sets instead
of 5:

| Variation | Week 1 | Week 2 | Week 3 |
|---|---|---|---|
| Base (constant %) | 65% × 5, 3×10 @ 40–60% | 70% × 5, 3×10 @ 40–60% | 75% × 5, 3×10 @ 40–60% |
| SLFBBB (Forever's percentages) | 65% × 5, 3×10 @ 60% | 70% × 5, 3×10 @ 50% | 75% × 5, 3×10 @ 70% |

(Main work shown above is the classic all-fives ordering the book's own
worked example uses — 65/75/85 → 70/80/90 → 75/85/95, each week's three main
sets omitted above for space; see `bbb-original`'s "Main work" table for the
full main-work brackets, which are identical.)

**Base** is the same constant-percentage mechanic as Original BBB, just 3
sets. **SLFBBB** — "a riff on Forever BBB," the book's own name — uses
Forever's standard-intensity percentages (60/50/70 by week), 3 sets instead
of 5; these numbers are identical to Forever BBB's own "Light" option, and
that overlap is expected, not an error — the book presents the same
mechanic under two names in two different sections.

**A third, structurally different scheme — 1×10 ascending:** same lift for
main and supplemental (no opposite-lift option), 1 set each at 50%, 60%, and
70% within a single session — "ideal for those short on time but want to
push themselves." The book notes you can also run it descending (70% down
to 50%). This isn't a set-count variant of either constant-% or
week-varying-% supplemental — it's its own prescription shape, always the
same regardless of week.

**Not stated in this section:** whether the 3/5/1 or "5/3/1 sets and reps
(PR set)" main-work bases (available as options on `bbb-original`) are also
valid here — only the classic ordering appears in this section's own worked
examples, unlike the FSL section a few pages later, which explicitly says
"You can also use the 3/5/1 programming for this template." Scope the
`mainWorkBase` option to whatever's confirmed when this template is built.

### Options

| Option | Values | Notes |
|---|---|---|
| Supplemental scheme | 3×10 constant % · 3×10 SLFBBB (Forever's %) · 1×10 ascending | The first two are per-lift like Original BBB's percentage option; the third fixes the lift to itself and the percentages to 50/60/70 |
| Supplemental percentage, per lift | 40–60% (constant/SLFBBB variations only) | Same range as Original BBB |

---

## `bbb-fsl` — Boring But Big, FSL *(deferred)*

Supplemental uses each week's first work set percentage.

| Week 1 | Week 2 | Week 3 |
|---|---|---|
| 65/75/85 × 5, then 5×10 @ 65% | 70/80/90 × 5, then 5×10 @ 70% | 75/85/95 × 5, then 5×10 @ 75% |

**Own template because the TM percentage differs** — capped at 85%, where the
family default permits 90%. The book also frames this as a long-term approach,
thinking 10–12 cycles ahead.

---

## `bbb-full-body` — Full Body BBB *(deferred)*

**Two main lifts per session**: one doing main work at 5's PRO, the other doing
5×10 supplemental at 50%. Available at four days and three days, the latter
running an A/B/C, D/A/B, C/D/A rotation.

Own template because session shape is structural.

---

## `bbb-mixed` — the four-day mixed variant *(deferred)*

BBB 5×10 at 40–60% for one pressing lift and one of squat or deadlift; **5×5
First Set Last** for the other two. Own template because the supplemental
*scheme* differs per lift, not just its percentage.

---

## `bbb-challenge` — BBB Challenge *(deferred)*

Three cycles, 5's Progression, no PR set. Supplemental percentage changes **by
cycle**: 50% in cycle one, 60% in cycle two, 70% in cycle three.

Blocked on two things that don't exist yet: a supplemental percentage that
varies by cycle, and a programming model with a fixed three-cycle standalone
phase. Requires the correct training max — 90% is the maximum, 85% is better
for those with several consistent years.

---

## Deadlift note (applies family-wide)

Whatever BBB option is used, the book's practice for deadlift supplemental work
is a double overhand grip with percentages based on an estimated double
overhand deadlift rather than the regular training max. Not currently modelled —
it would need a second training max for one lift.
