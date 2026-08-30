# PRD — Terminus

_A 5/3/1 planner and cheat sheet._

**Version:** 0.4 · **Owner:** you · **Status:** pre-build

---

## 1. What does it do?

A personal planning tool that turns a set of maxes and a chosen 5/3/1 template into a fully programmed multi-cycle plan, then acts as a quick-reference cheat sheet.

**Core loop:**

1. **Choose a programming model.** Four options, each fixing the cycle count:

   | Model    | Structure                               | Cycles |
   | -------- | --------------------------------------- | ------ |
   | Beginner | single template, no Leader/Anchor split | 1      |
   | 2 + 1    | 2 Leader cycles, 1 Anchor cycle         | 3      |
   | 2 + 2    | 2 Leader cycles, 2 Anchor cycles        | 4      |
   | 3 + 2    | 3 Leader cycles, 2 Anchor cycles        | 5      |

2. **Choose training days — four independent choices.** The Leader phase, the Anchor phase, the mid-plan 7th Week deload, and the closing 7th Week TM test (or PR test) each get their own day count (2–4). The book allows a Leader and an Anchor to run at different counts — a three-day Leader transitioning into a four-day Anchor, the way Original 5/3/1 A/B is meant to lead into the canonical Original 5/3/1 — and separately lets each 7th Week Protocol occurrence run at 2, 3, or 4 days regardless of either phase's count or the other occurrence's. The Beginner model has no Leader/Anchor split and therefore no deload, so it's one day-count choice for its single template plus one for its closing TM test. Each phase's day-count choice drives how that phase's lifts map to sessions and filters which templates are available for it.
3. **Choose templates.** Beginner model uses the Beginner template and skips this step. Otherwise pick the Leader first, from templates compatible with the Leader's chosen day count; the Anchor list is then filtered to templates the Leader can be followed by that are also compatible with the Anchor's own chosen day count. A template may be Leader-eligible, Anchor-eligible, or both; the Beginner template is neither, and is only valid with the Beginner model.
4. **Set the training max percentage.** Each template declares a percentage or a range. The **Leader template drives it**, and the resulting training max carries through the whole plan — Leader and Anchor alike. A fixed percentage is shown for approval; a range requires a choice.
5. **Select optional supplemental work** the chosen templates offer. Some options are per-lift rather than per-template — Original BBB's supplemental percentage, for instance, is commonly set lower for squat and deadlift.
6. **Enter maxes.** Actual or estimated 1RM for the four main lifts plus whatever supplemental lifts the chosen templates require — which is why this comes after template selection, not before. Built-in estimator: `weight × reps × 0.0333 + weight`.
7. **Review and approve.** Training max seeds are computed from the entered 1RMs and the chosen percentage, and the full plan is generated. The 1RMs themselves are not kept — the seed is the stored value from here on.

**The generated plan** runs Leader cycles → 7th Week Protocol deload → Anchor cycles → 7th Week Protocol TM test. The closing week is always a TM test, never a PR test. The Beginner model's single cycle has no Leader/Anchor boundary and therefore no mid-plan deload.

**Then, day to day:**

8. **View the plan.** Cycle-by-cycle and week-by-week view showing main work percentages and reps, supplemental work, assistance rep targets by category (push / pull / single-leg-core), jumps/throws, conditioning, and warm-up/mobility — all computed to actual weights, not percentages.
9. **Adjust a seed; the plan re-derives.** The plan holds no state of its own — no completion flag, no position marker, no dates. There are no actions, only inputs: change a seed, a template, a percentage, or a programming model, and the plan recomputes. A lift's seed moves in one of two ways:
   - **Normal progression**, available on every template — applied once a whole plan (every Leader and Anchor cycle) is complete: add the increment once per cycle the plan ran, not just once. A 2+1 plan runs 3 cycles total, so its next seed is `seed + 3 × increment` — continuing the exact per-cycle rate the plan already used internally (each cycle within a block already trains at `seed + increment × cycleIndex`) rather than resetting it at the plan boundary. The increment itself is defined by the template, falling back to a lift-level default (+10 lb squat/deadlift, +5 lb bench/press); the Beginner template overrides squat and deadlift to +5.
   - **Stalled lift**, Beginner only — subtract three increments from that lift's seed; this is Beginner's own documented remedy ("back up three cycles"), not a generic mechanic offered on every template. A stall is per-lift and can occur at any point in a block, not only at its end. No input required; this is arithmetic, not history. Other templates' own stall guidance is deferred until modelled (§4).

   **A failed 7th Week TM test isn't a third path** — it's the same "enter maxes" flow from step 6, run again with the weight × reps actually managed on the test. That flow already estimates a max from weight/reps and applies the lift's own already-effective percentage to derive a seed; a failed test needs nothing different, so it doesn't get its own control.

   Seeds are the only stored maxes; every cycle's training max is derived from them. Adjusting one lift's seed changes that lift's numbers and nothing else — the other lifts re-derive to exactly what they showed before, so there is nothing to restart. Because no position is tracked, a lift whose seed drops three increments simply shows lighter weights wherever you happen to be in the block. Updates are instant and in place.
10. **Browse the template library.** Templates with their Leader/Anchor eligibility, supported day counts, intended TM percentage or range, and assistance/conditioning guidance.

**Changing your mind later** uses the same screens as setup, reachable individually. Swapping just the Anchor template does not mean walking the whole flow again.

**Feel:** Tiimo-like. Minimal, calm, high-contrast. One screen answers "what am I doing for the next 3, 4, or 5 cycles, at what weight."

**Platform:** Web and iOS from the same codebase, day one. The same plan is available on both, synced through a single account. Reads work offline.

**Template library:** starts with the Beginner template, then Original BBB, and grows one at a time. Each variation in a family — Forever BBB, BBB FSL, Slightly Less BBB and the rest — is its own template record rather than an option on a shared one. The plan generator is data-driven and built so that adding a template means adding a template definition, not editing the generator.

## 2. Who uses it?

**User:** An intermediate lifter running 5/3/1 Forever who currently plans in spreadsheets or on paper.

**One account, multiple devices.** Phone and laptop show the same plan without manual re-entry. Authentication exists to support a user base.

**Design consequences:** no multi-user features, no sharing, no marketing surface, no support burden. Because the app stores only a current snapshot (see §4), the synced state is small. Template text is paraphrased; the book's content is Jim Wendler's not distributed.

## 3. What does success look like?

**Primary:** the app fully replaces the spreadsheet. For one complete Leader-through-Anchor block (≈4 months), you never open the old file and never do 5/3/1 arithmetic by hand.

**Supporting signals:**

- A new plan is generated end-to-end in under 3 minutes.
- A change made on the laptop is visible on the phone, with no export, re-entry, or thought given to it.
- Progressing training maxes is one tap, updates every affected weight in the plan instantly, and never requires re-entering maxes.
- Every displayed weight matches a hand-check against the book — a wrong number is a hard failure.
- **Adding the second template requires no changes to the plan generator.** This is the test of whether the data model is right.

## 4. What does it explicitly NOT do?

**Not a logger.** No recording of sets performed, reps hit, RPE, PR-set history, session notes, or completion checkmarks. TM progression happens by explicit user input.

**No progress _tracking_.** One word, two meanings, so to be exact: **progressing** — advancing training maxes and watching the plan update — is a core feature (§1.6). **Progress tracking** — charts, trends, strength-over-time graphs, past-cycle archives, "you added 40 lb this year" — is out. The app holds a snapshot: training max seeds, a template, a programming model, and the plan derived from them. It does not know what today's date is or which week you are on — you navigate to the week yourself. Generating overwrites state rather than appending to it.

**Also out of scope:**

- Sharing, social feeds, leaderboards, coaching others, managing multiple athletes
- Programs other than 5/3/1 (no Starting Strength, nSuns, GZCL, etc.)
- Nutrition, bodyweight, sleep, or recovery tracking
- HealthKit / Apple Watch / wearable integration
- Rest timers, exercise demo videos, form checks, AI coaching
- Conditioning _tracking_ — conditioning appears as reference guidance only
- Custom user-authored templates (library is curated and defined in code)

**Deliberately deferred, not rejected:** kilogram support, printable/exportable cycle sheets, user-authored templates, and the four alternate stall remedies (push the last set for a PR or goal, raise supplemental volume to 7–10×5 FSL, switch to 5×5/3/1, switch to SSL) — each unlocks when its template lands. V1 pairs a stall reset with repeating the same template.

---

**Decided:** managed backend — Supabase (Postgres + auth + row-level security). Chosen for transferable SQL/relational learning over Firebase's proprietary document model; offline read caching will be built by hand rather than inherited.

_Open decisions: which template shapes to model against before writing the generator (proposed: Beginner, BBB, 5×5/3/1 Supplemental Heaven)._
