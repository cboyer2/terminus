# Template family — Original 5/3/1

Source: *5/3/1 Forever*, Original 5/3/1 chapter. Paraphrased for personal use.

`family: "Original 5/3/1"`

---

## What the family shares

| Field | Value |
|---|---|
| Supplemental work | **None.** No template in this family has any |
| TM percentage | **80% · 85% · 90%, selectable, default 90%** — not stated in this chapter itself; see resolved note |
| Cycles per phase | 2–3 |
| Conditioning | Up to 4 hard days; prefer them on training days, off days for a recovery circuit. If pushing conditioning hard, restrict assistance volume |

The book is candid that the original program doesn't naturally suit the
Leader/Anchor structure but works with modification — and the modification is
assistance volume, nothing else. Main work, jumps/throws and conditioning are
explicitly unchanged between roles.

### Jumps and throws

10–20 total per workout. **The high end is for one main lift per day, the low
end for two main lifts per workout** — so this is a function of session shape,
not a flat number. Beginner and intermediate lifters with good ability may use
the high end regardless.

### Pairings named in the source

- **Original 5/3/1 (Leader) → Original 5/3/1 (Anchor)** — self-pairing. The
  book states this directly for the family's Leader-into-Anchor transitions
  ("Once you've done two to three cycles of this, you go back to the normal
  5/3/1 program"; "This would be done for two to three cycles and then the
  original 5/3/1 program would be done"), and role-keyed assistance (higher
  for the first two to three cycles, lower for the final two to three, main
  work/jumps/conditioning unchanged) is exactly what makes one template
  record able to serve as its own Anchor — see docs/ARCHITECTURE.md
  "Role-keyed fields". `original-531`'s `compatibleAnchorIds` is `[
  "original-531" ]` for this reason.
- **5/3/1 Widowmaker (Leader) → Original 5/3/1 (Anchor)** is described as the
  closest variation to the original program ("You would perform 2-3 cycles
  of 5/3/1 Widowmaker (Leader) followed by the Original 5/3/1 program
  (Anchor)"). Widowmaker itself isn't written yet, so this pairing isn't
  reachable in the app until it is.
- Original 5/3/1 appears on Boring But Big's list of permitted Anchors.

**Resolved:** the training max percentage is selectable — **80%, 85%, or
90%**, defaulting to **90%** — per *5/3/1 Forever*'s Deload/7th Week Protocol
chapter (p.20, stated there rather than in this chapter): "For the original
program, we always try to have our training max set at 90% of your actual or
estimated 1RM." The 85%/80-85% figures a few sentences later are introduced by
contrast — "As I've added different supplemental variations and more
volume... beginning with an 85% training max is often recommended" — and this
family has no supplemental work at all, so 90% is the default while 80% and
85% stay selectable for lifters who want to run it lighter. Not the 85–90% of
"Original 5/3/1 and First Set Last" (p.168) — that remains a separate
template. Nothing in the 10-rep or A/B sections restates a different value, so
all three templates in this family share it.

## Templates in this family

| ID | Distinguishing feature | Roles | Days | Cycle length |
|---|---|---|---|---|
| `original-531` | the canonical program | Leader and Anchor | 4 | 3 weeks |
| `original-531-10rep` | ten reps on the first set | **Leader only** | 4 | 3 weeks |
| `original-531-ab` | two main lifts per session | Leader and Anchor | **3** | **2 weeks** |

The five "variations" in the chapter collapse to three templates, because two
of them are role-keyed assistance rather than distinct programs — see the note
at the end.

---

## `original-531` — the canonical program

### Main work

| Week | Sets |
|---|---|
| 1 | 65% × 5, 75% × 5, 85% × 5+ |
| 2 | 70% × 3, 80% × 3, 90% × 3+ |
| 3 | 75% × 5, 85% × 3, 95% × 1+ |

**The final set of every week is a PR set** — beat your previous rep count at
that weight, or beat your old estimated max via the formula. This is the
canonical 5/3/1 table in the standard week ordering, unlike the 3/5/1
arrangement used in the Beginner and BBB chapters.

After the third week, the training max increases by 10 lb for squat and
deadlift, 5 lb for bench press and press.

### Session shape

Four days, one main lift per session: squat, bench press, deadlift, press. Each
session is warm-up/mobility, jumps/throws, main work, assistance, conditioning.
Bench/press and squat/deadlift may be swapped freely.

Jumps and throws: **20** (one main lift per day).

### Assistance — role-keyed

| Category | As Leader | As Anchor |
|---|---|---|
| Push | 100 reps/workout | 50–75 reps/workout |
| Pull | 100 reps/workout | 50–75 reps/workout |
| Single leg / core | 100 reps/workout | 50–75 reps/workout |

### Options

None beyond the plan-level settings. The chapter offers no knobs for this
template.

---

## `original-531-10rep` — ten reps on the first set

| Week | Sets |
|---|---|
| 1 | 65% × 10, 75% × 5, 85% × 5+ |
| 2 | 70% × 10, 80% × 5, 90% × 3+ |
| 3 | 75% × 10, 85% × 5, 95% × 1+ |

The final set is pushed hard with a goal of at least ten reps. Run for two to
three cycles, then return to the canonical program — which makes this a
**Leader with `original-531` as its Anchor**.

Assistance is 50–100 reps per category per workout, unchanged across all
cycles, so this template is **not** role-keyed. Session shape and jumps match
the canonical template.

### Options

None.

---

## `original-531-ab` — A/B, three days

Three days a week, two main lifts per session. "A" is squat and bench press;
"B" is deadlift and press.

| | Session 1 | Session 2 | Session 3 |
|---|---|---|---|
| Week 1 | Squat 3×5, Bench 3×5 | Deadlift 3×5, Press 3×5 | Squat 3×3, Bench 3×3 |
| Week 2 | Deadlift 3×3, Press 3×3 | Squat 5/3/1, Bench 5/3/1 | Deadlift 5/3/1, Press 5/3/1 |

Then change training maxes and repeat, for two to three cycles. The last set is
still pushed for a PR or a goal rep count.

⚠️ **A cycle here is two calendar weeks, not three.** Six sessions, each lift
trained three times — a fives session, a threes session and a 5/3/1 session.
Any assumption that a cycle is three weeks breaks on this template. Same
structure as the Beginner template.

Jumps and throws: **10** (two main lifts per session).

The book describes this as more intensive than the standard program and not for
everyone.

### Options

| Option | Values | Notes |
|---|---|---|
| Assistance profile | flat · role-keyed | Flat is 50–100 reps per category throughout. Role-keyed mirrors the canonical template: higher for the first two to three cycles, substantially lower afterwards — the book warns the daily workload gets heavy here |

---

## Why five variations became three

The chapter presents five options. Two of them are not templates:

- **The assistance-volume variation** changes only rep targets between early
  and late cycles. That is `ByRole<T>` on `original-531`, not a separate
  program — no new table, no constraint change.
- **The A/B-with-varying-assistance variation** is the same thing applied to
  `original-531-ab`, and is captured as that template's assistance-profile
  option.

This is the clearest illustration in the library of the difference between a
variation, an option, and a role-keyed field.
