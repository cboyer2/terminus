# PRD — Terminus

**Version:** 0.2 · **Owner:** you · **Status:** pre-build

---

## 1. What does it do?

A personal planning tool that turns a set of maxes and a chosen 5/3/1 template into a fully programmed multi-cycle plan, then acts as a quick-reference cheat sheet — on whichever device you want.

**Core loop:**

1. **Enter maxes.** Actual or estimated 1RM for the four main lifts (squat, bench, deadlift, press) and any supplemental lifts (front squat, floor press, deficit deadlift, incline press, etc.).
2. **Estimate a max if needed.** Built-in calculator: `weight × reps × 0.0333 + weight`.
3. **Derive training maxes.** Default percentage comes from the chosen template (80 / 85 / 90%), user-overridable. Supplemental lifts default to 80%.
4. **Pick a template and a programming model.** 2 Leaders + 1 Anchor, 2 + 2, or 3 + 2 — 3 to 5 cycles planned in advance, with the 7th Week Protocol auto-inserted (deload between Leader and Anchor; TM Test or PR Test before new programming).
5. **View the plan.** Cycle-by-cycle and week-by-week view showing main work percentages and reps, supplemental work, assistance rep targets by category (push / pull / single-leg-core), jumps/throws, conditioning, and warm-up/mobility — all computed to actual weights, not percentages.
6. **Adjust a seed; the plan re-derives.** The plan holds no state of its own — no completion flag, no position marker, no dates. There are no actions, only inputs: change a seed, a template, or a programming model, and the plan recomputes. Each lift's seed moves independently, by one of three paths:
   - **Normal progression** — add the increment. The increment is defined by the template, falling back to a lift-level default (+10 lb squat/deadlift, +5 lb bench/press); the Beginner template overrides squat and deadlift to +5.
   - **Failed 7th Week TM test** — enter the weight × reps actually managed; the app runs the estimated-max formula and suggests a training max at 85–90% of it.
   - **Stalled lift** — subtract three increments from that lift's seed.

   Seeds are the only stored maxes; every cycle's training max is derived from them. Adjusting one lift's seed changes that lift's numbers and nothing else — the other lifts re-derive to exactly what they showed before. Because no position is tracked, a lift whose seed drops three increments simply shows lighter weights. Updates are instant and in place.

7. **Browse the template library.** Leader and Anchor templates with their intended TM %, cycle counts, and assistance/conditioning guidance.

**Feel:** Tiimo-like. Minimal, calm, high-contrast. One screen answers "what am I doing, at what weight."

**Platform:** Web and iOS from the same codebase, day one. The same plan is available on both, synced through a single account. Reads work offline.

**Template library:** starts with the Beginner template and grows one at a time. The plan generator is data-driven and built so that adding a template means adding a template definition, not editing the generator.

## 2. Who uses it?

**User:** An intermediate lifter running 5/3/1 Forever who currently plans in spreadsheets or on paper.

**One account, multiple devices.** Phone and laptop show the same plan without manual re-entry. Authentication exists to support a user base.

**Design consequences:** no multi-user features, no sharing, no marketing surface, no support burden. Because the app stores only a current snapshot (see §4), the synced state is small. Template text is paraphrased; the book's content is Jim Wendler's not distributed.

## 3. What does success look like?

**Primary:** the app fully replaces the spreadsheet. For one complete Leader-through-Anchor block (≈4 months), you never open the old file and never do 5/3/1 arithmetic by hand.

**Supporting signals:**

- A new multi-cycle plan is generated end-to-end in under 3 minutes.
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
