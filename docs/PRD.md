# PRD — Terminus

*A 5/3/1 planner and cheat sheet.*

**Version:** 0.6 · **Owner:** you · **Status:** in build

---

## 1. What does it do?

A personal planning tool that turns a set of maxes and a chosen 5/3/1 template into a fully programmed multi-cycle plan, then acts as a quick-reference cheat sheet.

**Core loop:**

1. **Choose a programming model.** Four options, each fixing the cycle count:

   | Model | Structure | Cycles |
   |---|---|---|
   | Beginner | single template, no Leader/Anchor split | 1 |
   | 2 + 1 | 2 Leader cycles, 1 Anchor cycle | 3 |
   | 2 + 2 | 2 Leader cycles, 2 Anchor cycles | 4 |
   | 3 + 2 | 3 Leader cycles, 2 Anchor cycles | 5 |

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

**Feel:** Tiimo-like. Minimal, calm, high-contrast, glanceable one-handed mid-workout. One screen answers "what is my training plan?"

**Platform:** an installable PWA — a Svelte + Vite static build served from GitHub Pages, added to the iPhone Home Screen. All state lives in localStorage on the device: no backend, no account, no sync. Native iOS builds are out of scope; they were the sole reason for the original Expo stack and the toolchain cost more than it returned.

**Template library:** starts with the Beginner template, then Original BBB, and grows one at a time. Each variation in a family — Forever BBB, BBB FSL, Slightly Less BBB and the rest — is its own template record rather than an option on a shared one. The plan generator is data-driven and built so that adding a template means adding a template definition, not editing the generator.

## 2. Who uses it?

**One user: you.** An intermediate lifter running 5/3/1 Forever who currently plans in spreadsheets or on paper.

**One device.** The iPhone is the device this is used on. State lives in that browser's localStorage, with manual JSON export and import as the backup — clearing site data would otherwise lose everything.

**Design consequences:** no feature ever involves a second human — no sharing, coach/athlete roles, permissions, invites, comments, or public template library. No onboarding flow, no marketing surface, no support burden. The whole stored state is a few hundred bytes of JSON on one device. Template text is paraphrased for personal use; the book's content is Jim Wendler's, which is why the template specs stay out of the public repo.

## 3. What does success look like?

**Primary:** the app fully replaces the spreadsheet. For one complete Leader-through-Anchor block (≈4 months), you never open the old file and never do 5/3/1 arithmetic by hand.

**Supporting signals:**

- A new 5-cycle plan is generated end-to-end in under 3 minutes.
- Progressing training maxes is one tap, updates every affected weight in the plan instantly, and never requires re-entering maxes.
- Every displayed weight matches a hand-check against the book.
- **Adding the second template requires no changes to the plan generator.** This is the test of whether the data model is right.
- An export file restores the app's full state on a fresh install.

## 4. What does it explicitly NOT do?

**Not a logger — permanently, not just in v1.** No recording of sets performed, reps hit, RPE, PR-set history, session notes, or completion checkmarks. Logging is handled by a separate app and any overlap is a defect, not a feature. TM progression happens by explicit user input at cycle boundaries and is never inferred from performance.

**No progress *tracking* — permanently.** One word, two meanings, so to be exact: **progressing** — advancing training maxes and watching the plan update — is a core feature (§1.6). **Progress tracking** — charts, trends, strength-over-time graphs, past-cycle archives, "you added 40 lb this year" — is out, permanently. The app holds a snapshot: training max seeds, a template, a programming model, and the plan derived from them. It does not know what today's date is or which week you are on — you navigate to the week yourself. Generating overwrites state rather than appending to it.

**Also out of scope:**

- Sharing, social feeds, leaderboards, coaching others, managing multiple athletes
- Programs other than 5/3/1 (no Starting Strength, nSuns, GZCL, etc.)
- Nutrition, bodyweight, sleep, or recovery tracking
- HealthKit / Apple Watch / wearable integration
- Rest timers, exercise demo videos, form checks, AI coaching
- Conditioning *tracking* — conditioning appears as reference guidance only
- App Store distribution, monetization, analytics, crash reporting
- Custom user-authored templates (library is curated and defined in code)

**Deliberately deferred, not rejected:** plate-loading math, kilogram support, printable/exportable cycle sheets, and user-authored templates. Of the alternate stall remedies, raising supplemental volume and switching to SSL are template *options* rather than deferred work; pushing the last set for a PR or goal needs a per-set flag on main work; only switching to 5×5/3/1 waits on another template.

---

**Decided (Oct 2026):** no backend. Supabase was chosen originally for cross-device sync and for the learning value of a managed Postgres. With the app installed on one phone and the learning goal retired, it was removed — along with accounts, RLS, keys and environment variables.
