# Template spec — Original 5/3/1

Source: *5/3/1 Forever*, Original 5/3/1 chapter. Paraphrased for personal use.
This is the hand-verification reference for the `original-531` template record
and its fixture.

---

## Identity and constraints

| Field | Value |
|---|---|
| `id` | `original-531` |
| Role eligibility | **Both** — via role-keyed assistance targets, see below |
| Supported day counts | 4 |
| TM percentage | ⚠️ not stated in this chapter — see unresolved note |
| Cycles | 2–3 per phase |

The book is candid that the original program doesn't naturally suit the
Leader/Anchor structure, but works with modification — and the modification is
assistance volume, nothing else.

### Pairings named in the source

- **5/3/1 Widowmaker (Leader) → Original 5/3/1 (Anchor)** is described as the
  closest variation to the original program.
- Original 5/3/1 also appears on Boring But Big's list of permitted Anchors.

## Session shape

Four days, one main lift per session: squat, bench press, deadlift, press. Each
session is warm-up/mobility, jumps/throws, main work, assistance,
conditioning. The book notes bench/press and squat/deadlift may be swapped
freely.

## Main work

| Week | Sets |
|---|---|
| 1 | 65% × 5, 75% × 5, 85% × 5+ |
| 2 | 70% × 3, 80% × 3, 90% × 3+ |
| 3 | 75% × 5, 85% × 3, 95% × 1+ |

**The final set of every week is a PR set** — beat your previous rep count at
that weight, or beat your old estimated max via the formula. This is the
canonical 5/3/1 table and the standard week ordering, unlike the 3/5/1
arrangement used in the Beginner and BBB chapters.

After the third week, increase the training max by 10 lb for squat and deadlift
and 5 lb for bench press and press.

## Assistance — role-keyed

This is the only field that differs between Leader and Anchor use, and it is
the reason `ByRole<T>` exists in the architecture.

| Category | As Leader (first 2–3 cycles) | As Anchor (final 2–3 cycles) |
|---|---|---|
| Push | 100 reps/workout | 50–75 reps/workout |
| Pull | 100 reps/workout | 50–75 reps/workout |
| Single leg / core | 100 reps/workout | 50–75 reps/workout |

The book states explicitly that main work, jumps/throws and conditioning are
unchanged between the two — only assistance volume moves.

## Jumps and throws

10–20 total per workout. **The high end is for one main lift per day; the low
end for two main lifts per workout.** Since this template is one lift per day,
use 20. Beginner and intermediate lifters with good ability may use the high
end regardless.

Note this makes jump volume a function of session shape, not a flat number.

## Conditioning

Up to four hard days, though the book warns this catches up with the
unprepared. Preference is harder conditioning on training days, with off days
used for a recovery circuit. If conditioning is being pushed hard, assistance
volume should be restricted.

## Variations — separate templates

Per the decision that each variation is its own record:

### Original 5/3/1, 10-rep first set

| Week | Sets |
|---|---|
| 1 | 65% × 10, 75% × 5, 85% × 5+ |
| 2 | 70% × 10, 80% × 5, 90% × 3+ |
| 3 | 75% × 10, 85% × 5, 95% × 1+ |

The final set is pushed hard with a goal of at least ten reps. Run for two to
three cycles, then return to normal Original 5/3/1 — which makes this a
**Leader with Original 5/3/1 as its Anchor**. Assistance is 50–100 reps per
category per workout, unchanged across all five cycles, so this variation is
*not* role-keyed.

### Original 5/3/1, A/B three-day

Three days a week, two main lifts per session. "A" is squat and bench press;
"B" is deadlift and press.

| | Monday | Wednesday | Friday |
|---|---|---|---|
| Week 1 | Squat 3×5, Bench 3×5 | Deadlift 3×5, Press 3×5 | Squat 3×3, Bench 3×3 |
| Week 2 | Deadlift 3×3, Press 3×3 | Squat 5/3/1, Bench 5/3/1 | Deadlift 5/3/1, Press 5/3/1 |

Then change training maxes and repeat, for two to three cycles. Assistance is
50–100 reps per category throughout.

⚠️ **A cycle here is two calendar weeks, not three.** Each lift is trained three
times per cycle — a fives session, a threes session, and a 5/3/1 session —
across six sessions in two weeks. Any assumption that a cycle equals three
weeks breaks on this variation.

Jump volume should be the low end (10) here, since there are two main lifts per
session.

## Unresolved

**Training max percentage.** This chapter does not state one. The adjacent
Original 5/3/1 and First Set Last template specifies 85–90% TM, but that is a
different template. Confirm from the main 5/3/1 chapter before encoding.
