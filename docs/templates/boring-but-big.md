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
| `bbb-fsl` | supplemental tracks the first work set; TM capped at 85% | deferred |
| `bbb-full-body` | two main lifts per session | deferred |
| `bbb-mixed` | BBB on two lifts, 5×5 FSL on the other two | deferred |
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
reintroduces the PR set on the final set of each week — this is the one base
that needs the per-set PR/AMRAP flag already listed as a known gap in
docs/ARCHITECTURE.md §8, not yet modelled on `MainWorkSet`.

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
| Supplemental set scheme | 5×10 · 3×10 · 1×10 ascending at 50/60/70% | 3×10 is the "Slightly Less BBB" table; the ascending option is for cutting session time while keeping some heavier work |
| Supplemental lift | same as main · opposite | Original permits the opposite lift — bench main, press supplemental. Forever BBB does not |

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
| Supplemental set count | 5×10 · 3×10 (the "Light" and SLFBBB tables) |

> **Note on the rule.** Two printed tables here, but they differ in no
> setup-constraint field — same role, days, TM percentage, anchors. So they are
> one template with an intensity option. This is the case where the
> printed-table shortcut and the formal constraint test disagree; **the
> constraint test wins.**

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
