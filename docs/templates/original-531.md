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
- **Original 5/3/1 A/B (Leader) → Original 5/3/1 (Anchor)** — corrected from
  an earlier, wrong assumption that A/B self-pairs the same way the canonical
  program does. The owner confirmed the book names only this one compatible
  anchor for A/B. A/B is therefore **Leader only**, like `original-531-10rep`
  — it is never itself a book-named Anchor destination, so its own
  `roleEligibility` is `"leader"`, not `"both"`.

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
| `original-531-ab` | two main lifts per session | **Leader only** | **3** | **2 weeks** |

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

**Percentages (confirmed by the owner): identical to `original-531`'s
canonical table.** The "3×5"/"3×3"/"5/3/1" labels describe each session's
set/rep shape, not a separate percentage table:

| Session label | Sets |
|---|---|
| "3×5" (fives) | 65% × 5, 75% × 5, 85% × 5+ |
| "3×3" (threes) | 70% × 3, 80% × 3, 90% × 3+ |
| "5/3/1" | 75% × 5, 85% × 3, 95% × 1+ |

Then change training maxes and repeat, for two to three cycles. The last set is
still pushed for a PR or a goal rep count — same PR-set placement as the
canonical table.

**Resolved: a cycle here is two calendar weeks, not three.** Six sessions,
each lift trained three times — a fives session, a threes session and a
5/3/1 session. Any assumption that a cycle is three weeks breaks on this
template. Same structure as the Beginner template. Modelled with the same
mechanism as `bbb-original`'s 3-day rotation (`weeks: Workout[][]`, per-lift
appearance counting in `cycles.ts`'s `buildMainCycleSessions`) — squat and
bench always appear together, so they always share an appearance count (and
therefore a progression step); deadlift and press likewise. No generator
change was needed for two lifts per session — see `docs/ARCHITECTURE.md`
"Known model gaps", corrected alongside this template.

Jumps and throws: **10** (two main lifts per session).

The book describes this as more intensive than the standard program and not for
everyone.

### Options

**Corrected three times — worth recording all three, since each one narrowed
in on what the book actually describes:**

1. First pass described the second option as role-keyed, mirroring
   canonical's own Leader/Anchor split on A/B *itself* — wrong, because A/B
   doesn't self-pair (see "Pairings named in the source").
2. Second pass over-corrected: it dropped the role-keyed numbers entirely,
   on the assumption that anything A/B can't reach in the "anchor" role is
   dead data.
3. Third pass, from the owner's own rigid restatement: **the "anchor" side
   of every one of the book's four options is literally the same template —
   canonical `original-531` — because that's the only compatible anchor
   every Leader in this family has.** What actually varies is *which
   assistance volume `original-531` uses as an Anchor*, depending on which
   Leader (and, for A/B, which of its own two profiles) just ran:

| Leader that just ran | `original-531` Anchor volume |
|---|---|
| `original-531` itself (self-pairing) | 50–75 (its own default) |
| `original-531-10rep` | 50–100 |
| `original-531-ab`, "flat" profile | 50–100 |
| `original-531-ab`, "roleKeyed" profile | 50–75 (matches its own default) |

This isn't a property either template can express alone — `original-531`'s
own Anchor-cycle assistance depends on *who preceded it*, not just on its
own role. Modelled as `Template.anchorAssistanceFollowsLeader`: a Leader
template may declare that whoever follows it as Anchor should resolve
assistance from *the Leader's own* `assistance` field (in the "anchor"
role) instead of the Anchor's own — see that field's doc comment in
types.ts and `generatePlan`'s use of it in cycles.ts. `original-531`,
`original-531-10rep`, and `original-531-ab` all set it; `bbb-original` does
not, so `original-531` running as `bbb-original`'s Anchor keeps its own
50–75 default untouched. No branching on any specific template id — it's a
generic, opt-in flag any Leader can set.

`original-531-ab`'s own `assistance` field (both profiles) is therefore
doing double duty: it's A/B's own Leader-cycle volume, *and* — via
`anchorAssistanceFollowsLeader` — the source of whatever `original-531`'s
following Anchor cycles use. No separate "pairing" data was needed; the
existing per-template `assistance` field, resolved in the "anchor" role,
already produces every one of the four numbers above.

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
