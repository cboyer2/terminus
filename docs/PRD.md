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

2. **Choose training days.** Between 2 and 4. This drives how lifts map to sessions and filters which templates are available.
3. **Choose templates.** Beginner model uses the Beginner template and skips this step. Otherwise pick the Leader first, from templates compatible with the chosen day count; the Anchor list is then filtered to those the Leader can be followed by. A template may be Leader-eligible, Anchor-eligible, or both; the Beginner template is neither, and is only valid with the Beginner model.
4. **Set the training max percentage.** Each template declares a percentage or a range. The **Leader template drives it**, and the resulting training max carries through the whole plan — Leader and Anchor alike. A fixed percentage is shown for approval; a range requires a choice.
5. **Select optional supplemental work** the chosen templates offer. Some options are per-lift rather than per-template — Original BBB's supplemental percentage, for instance, is commonly set lower for squat and deadlift.
6. **Enter maxes.** Actual or estimated 1RM for the four main lifts plus whatever supplemental lifts the chosen templates require — which is why this comes after template selection, not before. Built-in estimator: `weight × reps × 0.0333 + weight`.
7. **Review and approve.** Training max seeds are computed from the entered 1RMs and the chosen percentage, and the full plan is generated. The 1RMs themselves are not kept — the seed is the stored value from here on.

**The generated plan** runs Leader cycles → 7th Week Protocol deload → Anchor cycles → 7th Week Protocol TM test. The closing week is always a TM test, never a PR test. The Beginner model's single cycle has no Leader/Anchor boundary and therefore no mid-plan deload.

**Then, day to day:**

8. **View the plan.** Cycle-by-cycle and week-by-week view showing main work percentages and reps, supplemental work, assistance rep targets by category (push / pull / single-leg-core), jumps/throws, conditioning, and warm-up/mobility — all computed to actual weights, not percentages.
9. **Adjust a seed; the plan re-derives.** The plan holds no state of its own — no completion flag, no position marker, no dates. There are no actions, only inputs: change a seed, a template, a percentage, or a programming model, and the plan recomputes. Each lift's seed moves independently, by one of three paths:
   - **Normal progression** — add the increment. The increment is defined by the template, falling back to a lift-level default (+10 lb squat/deadlift, +5 lb bench/press); the Beginner template overrides squat and deadlift to +5.
   - **Failed 7th Week TM test** — enter the weight × reps actually managed; the app runs the estimated-max formula and suggests a training max at 85–90% of it.
   - **Stalled lift** — subtract three increments from that lift's seed. A stall is per-lift and can occur at any point in a block, not only at its end. No input required; this is arithmetic, not history.

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
