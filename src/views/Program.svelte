<script lang="ts">
  // Programming model, training days, and Leader/Anchor template picker.
  // Ported from the old templates.tsx. stateStore is the seam into
  // generator/; this view reads the template library directly (it's a
  // curated code module, not stored data — docs/ARCHITECTURE.md §3) but
  // never computes a Plan itself.
  //
  // Training days is four independent choices — Leader, Anchor, the 7th
  // Week deload, and the closing 7th Week TM test can each run at a
  // different day count. See docs/ARCHITECTURE.md §3 and
  // docs/plan-structure.md "Placement rules".
  import { get } from "svelte/store";

  import { rescaleTrainingMaxSeed } from "../generator/calc";
  import { TEMPLATES } from "../generator/templates";
  import { DEFAULT_INCREMENT_LB, PROGRAMMING_MODELS } from "../generator/types";
  import type {
    AssistanceProfile,
    LiftKey,
    MainWorkBase,
    Program,
    ProgrammingModelId,
    Template,
    TemplateId,
    TemplateRole,
  } from "../generator/types";
  import { LIFT_LABELS, LIFT_ORDER } from "../lift-labels";
  import { stateStore } from "../stores/state";

  const MAIN_WORK_BASE_LABELS: Record<MainWorkBase, string> = {
    "3/5/1": "3/5/1 (all fives)",
    classic: "Classic (all fives)",
    prSet: "5/3/1 sets and reps (PR set)",
  };

  const ASSISTANCE_PROFILE_ITEMS: { label: string; value: AssistanceProfile }[] = [
    { label: "50-100 reps (default)", value: "flat" },
    { label: "100 reps", value: "roleKeyed" },
  ];

  const DEFAULT_SUPPLEMENTAL_PERCENT = "default" as const;
  type SupplementalPercentPick = typeof DEFAULT_SUPPLEMENTAL_PERCENT | number;
  const SUPPLEMENTAL_PERCENT_ITEMS: { label: string; value: SupplementalPercentPick }[] = [
    { label: "40%", value: 40 },
    { label: "45%", value: 45 },
    { label: "50% (default)", value: DEFAULT_SUPPLEMENTAL_PERCENT },
    { label: "55%", value: 55 },
    { label: "60%", value: 60 },
  ];

  type SupplementalLiftPick = "same" | "opposite";
  const SUPPLEMENTAL_LIFT_ITEMS: { label: string; value: SupplementalLiftPick }[] = [
    { label: "Same as main", value: "same" },
    { label: "Opposite lift", value: "opposite" },
  ];

  const DEFAULT_SUPPLEMENTAL_SOURCE = "default" as const;
  type SupplementalSourcePick = typeof DEFAULT_SUPPLEMENTAL_SOURCE | "firstSetLast" | "secondSetLast";
  const SUPPLEMENTAL_SOURCE_ITEMS: { label: string; value: SupplementalSourcePick }[] = [
    { label: "Plan default", value: DEFAULT_SUPPLEMENTAL_SOURCE },
    { label: "First Set Last", value: "firstSetLast" },
    { label: "Second Set Last", value: "secondSetLast" },
  ];

  const DEFAULT_SUPPLEMENTAL_SET_COUNT = "default" as const;
  type SupplementalSetCountPick = typeof DEFAULT_SUPPLEMENTAL_SET_COUNT | number;
  const SUPPLEMENTAL_SET_COUNT_ITEMS: { label: string; value: SupplementalSetCountPick }[] = [
    { label: "5 (default)", value: DEFAULT_SUPPLEMENTAL_SET_COUNT },
    { label: "7", value: 7 },
    { label: "8", value: 8 },
    { label: "9", value: 9 },
    { label: "10", value: 10 },
  ];

  const PR_SET_ITEMS: { label: string; value: "off" | "on" }[] = [
    { label: "Off", value: "off" },
    { label: "On", value: "on" },
  ];

  type IncrementPick = 5 | 10;
  const INCREMENT_ITEMS: { label: string; value: IncrementPick }[] = [
    { label: "5 lb", value: 5 },
    { label: "10 lb (default)", value: 10 },
  ];

  const PERCENTAGE_OVERRIDE_DEFAULT = "default" as const;
  type PercentageOverridePick = typeof PERCENTAGE_OVERRIDE_DEFAULT | number;
  const PERCENTAGE_OVERRIDE_ITEMS: { label: string; value: PercentageOverridePick }[] = [
    { label: "Plan default", value: PERCENTAGE_OVERRIDE_DEFAULT },
    { label: "70%", value: 70 },
    { label: "75%", value: 75 },
    { label: "80%", value: 80 },
    { label: "85%", value: 85 },
    { label: "90%", value: 90 },
    { label: "95%", value: 95 },
  ];

  const MODEL_LABELS: Record<ProgrammingModelId, string> = {
    beginner: "Beginner",
    "2+1": "2 Leader / 1 Anchor",
    "2+2": "2 Leader / 2 Anchor",
    "3+2": "3 Leader / 2 Anchor",
  };
  const MODEL_IDS = Object.keys(PROGRAMMING_MODELS) as ProgrammingModelId[];

  function eligibleForRole(template: Template, role: TemplateRole): boolean {
    if (role === "standalone") return template.roleEligibility === "neither";
    if (role === "leader") return template.roleEligibility === "leader" || template.roleEligibility === "both";
    return template.roleEligibility === "anchor" || template.roleEligibility === "both";
  }

  function percentageChoicesFor(template: Template | undefined): number[] {
    if (!template) return [];
    const tp = template.tmPercentage;
    if (tp.kind === "fixed") return [tp.value];
    const steps: number[] = [];
    for (let p = tp.min; p <= tp.max + 1e-9; p += 0.05) {
      steps.push(Math.round(p * 100) / 100);
    }
    return steps;
  }

  function preferredPercentage(template: Template | undefined): number {
    const tp = template?.tmPercentage;
    if (!tp) return 0.9;
    return tp.kind === "fixed" ? tp.value : tp.default;
  }

  const allTemplates = Object.values(TEMPLATES);

  // State loads synchronously from localStorage (no backend, no fetch
  // race), so pick state is simply seeded once from whatever was already
  // stored — after that, the user's own edits are the only thing that
  // changes these.
  const initial = get(stateStore);

  let programmingModel: ProgrammingModelId = initial.program?.programmingModel ?? "beginner";
  let leaderTrainingDaysPick: 2 | 3 | 4 = initial.program?.leaderTrainingDays ?? 3;
  let anchorTrainingDaysPick: 2 | 3 | 4 = initial.program?.anchorTrainingDays ?? 4;
  let deloadTrainingDaysPick: 2 | 3 | 4 = initial.program?.deloadTrainingDays ?? 4;
  let tmTestTrainingDaysPick: 2 | 3 | 4 = initial.program?.tmTestTrainingDays ?? 3;
  let leaderTemplateIdPick: TemplateId = initial.program?.leaderTemplateId ?? "";
  let anchorTemplateIdPick: TemplateId | null = initial.program?.anchorTemplateId ?? null;
  let tmPercentagePick: number = initial.program?.tmPercentage ?? 0.9;

  const savedBase = initial.program?.options?.mainWorkBase;
  let mainWorkBasePick: MainWorkBase = savedBase === "classic" || savedBase === "prSet" ? savedBase : "3/5/1";

  const savedAssistanceProfile = initial.program?.options?.assistanceProfile;
  let assistanceProfilePick: AssistanceProfile = savedAssistanceProfile === "roleKeyed" ? "roleKeyed" : "flat";

  const savedSupplementalPercentageByLift = initial.program?.options?.supplementalPercentageByLift as
    | Partial<Record<LiftKey, number>>
    | undefined;
  let supplementalPercentPicks: Record<LiftKey, SupplementalPercentPick> = {
    squat: savedSupplementalPercentageByLift?.squat !== undefined ? Math.round(savedSupplementalPercentageByLift.squat * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
    bench: savedSupplementalPercentageByLift?.bench !== undefined ? Math.round(savedSupplementalPercentageByLift.bench * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
    deadlift:
      savedSupplementalPercentageByLift?.deadlift !== undefined
        ? Math.round(savedSupplementalPercentageByLift.deadlift * 100)
        : DEFAULT_SUPPLEMENTAL_PERCENT,
    press: savedSupplementalPercentageByLift?.press !== undefined ? Math.round(savedSupplementalPercentageByLift.press * 100) : DEFAULT_SUPPLEMENTAL_PERCENT,
  };

  let supplementalLiftPick: SupplementalLiftPick = initial.program?.options?.supplementalOppositeLift === true ? "opposite" : "same";

  const savedSupplementalSourceByLift = initial.program?.options?.supplementalSourceByLift as
    | Partial<Record<LiftKey, "firstSetLast" | "secondSetLast">>
    | undefined;
  let supplementalSourcePicks: Record<LiftKey, SupplementalSourcePick> = {
    squat: savedSupplementalSourceByLift?.squat ?? DEFAULT_SUPPLEMENTAL_SOURCE,
    bench: savedSupplementalSourceByLift?.bench ?? DEFAULT_SUPPLEMENTAL_SOURCE,
    deadlift: savedSupplementalSourceByLift?.deadlift ?? DEFAULT_SUPPLEMENTAL_SOURCE,
    press: savedSupplementalSourceByLift?.press ?? DEFAULT_SUPPLEMENTAL_SOURCE,
  };

  const savedSupplementalSetCountByLift = initial.program?.options?.supplementalSetCountByLift as Partial<Record<LiftKey, number>> | undefined;
  let supplementalSetCountPicks: Record<LiftKey, SupplementalSetCountPick> = {
    squat: savedSupplementalSetCountByLift?.squat ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
    bench: savedSupplementalSetCountByLift?.bench ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
    deadlift: savedSupplementalSetCountByLift?.deadlift ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
    press: savedSupplementalSetCountByLift?.press ?? DEFAULT_SUPPLEMENTAL_SET_COUNT,
  };

  const savedPrSetOnFinalSetByLift = initial.program?.options?.prSetOnFinalSetByLift as Partial<Record<LiftKey, boolean>> | undefined;
  let prSetOnFinalSetPicks: Record<LiftKey, "off" | "on"> = {
    squat: savedPrSetOnFinalSetByLift?.squat ? "on" : "off",
    bench: savedPrSetOnFinalSetByLift?.bench ? "on" : "off",
    deadlift: savedPrSetOnFinalSetByLift?.deadlift ? "on" : "off",
    press: savedPrSetOnFinalSetByLift?.press ? "on" : "off",
  };

  let squatIncrementPick: IncrementPick = initial.lifts.find((l) => l.liftKey === "squat")?.increment === 5 ? 5 : 10;
  let deadliftIncrementPick: IncrementPick = initial.lifts.find((l) => l.liftKey === "deadlift")?.increment === 5 ? 5 : 10;

  function overrideFor(liftKey: LiftKey): PercentageOverridePick {
    const override = initial.lifts.find((l) => l.liftKey === liftKey)?.tmPercentageOverride;
    return override != null ? Math.round(override * 100) : PERCENTAGE_OVERRIDE_DEFAULT;
  }
  let percentageOverridePicks: Record<LiftKey, PercentageOverridePick> = {
    squat: overrideFor("squat"),
    bench: overrideFor("bench"),
    deadlift: overrideFor("deadlift"),
    press: overrideFor("press"),
  };

  let saveMessage: string | null = null;
  let saveError: string | null = null;

  $: isBeginnerModel = programmingModel === "beginner";

  $: leaderAvailableDayCounts = (() => {
    const role: TemplateRole = isBeginnerModel ? "standalone" : "leader";
    const days = new Set<number>();
    for (const t of allTemplates) {
      if (eligibleForRole(t, role)) t.supportedDayCounts.forEach((d) => days.add(d));
    }
    return [...days].sort((a, b) => a - b) as (2 | 3 | 4)[];
  })();

  $: leaderTrainingDays = leaderAvailableDayCounts.includes(leaderTrainingDaysPick)
    ? leaderTrainingDaysPick
    : (leaderAvailableDayCounts[0] ?? leaderTrainingDaysPick);

  $: leaderOptions = (() => {
    const role: TemplateRole = isBeginnerModel ? "standalone" : "leader";
    return allTemplates.filter((t) => eligibleForRole(t, role) && t.supportedDayCounts.includes(leaderTrainingDays));
  })();

  $: leaderTemplateId = leaderOptions.some((t) => t.id === leaderTemplateIdPick) ? leaderTemplateIdPick : (leaderOptions[0]?.id ?? "");
  $: leaderTemplate = leaderTemplateId ? TEMPLATES[leaderTemplateId] : undefined;

  $: anchorAvailableDayCounts = (() => {
    if (isBeginnerModel || !leaderTemplate) return [] as (2 | 3 | 4)[];
    const days = new Set<number>();
    for (const t of allTemplates) {
      if (eligibleForRole(t, "anchor") && leaderTemplate.compatibleAnchorIds.includes(t.id)) {
        t.supportedDayCounts.forEach((d) => days.add(d));
      }
    }
    return [...days].sort((a, b) => a - b) as (2 | 3 | 4)[];
  })();

  $: anchorTrainingDays = anchorAvailableDayCounts.includes(anchorTrainingDaysPick)
    ? anchorTrainingDaysPick
    : (anchorAvailableDayCounts[0] ?? anchorTrainingDaysPick);

  $: anchorOptions = (() => {
    if (isBeginnerModel || !leaderTemplate) return [] as Template[];
    return allTemplates.filter(
      (t) => eligibleForRole(t, "anchor") && t.supportedDayCounts.includes(anchorTrainingDays) && leaderTemplate!.compatibleAnchorIds.includes(t.id)
    );
  })();

  $: anchorTemplateId = isBeginnerModel
    ? null
    : anchorOptions.some((t) => t.id === anchorTemplateIdPick)
      ? anchorTemplateIdPick
      : (anchorOptions[0]?.id ?? null);

  $: percentageChoices = percentageChoicesFor(leaderTemplate);
  $: tmPercentage = percentageChoices.includes(tmPercentagePick)
    ? tmPercentagePick
    : percentageChoices.includes(preferredPercentage(leaderTemplate))
      ? preferredPercentage(leaderTemplate)
      : (percentageChoices[0] ?? tmPercentagePick);

  // Only bbb-original and original-531-ab have any options wired into the
  // generator so far.
  $: isBbbOriginalLeader = leaderTemplateId === "bbb-original";
  $: isOriginalAbLeader = leaderTemplateId === "original-531-ab";

  $: lifts = $stateStore.lifts;
  $: program = $stateStore.program;

  function handleSave() {
    if (!leaderTemplateId) {
      saveError = "No template is available for this combination yet.";
      return;
    }
    const options: Record<string, unknown> = { ...program?.options };
    if (isBbbOriginalLeader) {
      options.mainWorkBase = mainWorkBasePick;
      const overrides: Partial<Record<LiftKey, number>> = {};
      for (const liftKey of LIFT_ORDER) {
        const pick = supplementalPercentPicks[liftKey];
        if (pick !== DEFAULT_SUPPLEMENTAL_PERCENT) overrides[liftKey] = (pick as number) / 100;
      }
      if (Object.keys(overrides).length > 0) options.supplementalPercentageByLift = overrides;
      else delete options.supplementalPercentageByLift;

      if (supplementalLiftPick === "opposite") options.supplementalOppositeLift = true;
      else delete options.supplementalOppositeLift;
    }
    if (isOriginalAbLeader) {
      options.assistanceProfile = assistanceProfilePick;
    }
    if (isBeginnerModel) {
      const sourceOverrides: Partial<Record<LiftKey, "firstSetLast" | "secondSetLast">> = {};
      const setCountOverrides: Partial<Record<LiftKey, number>> = {};
      const prSetOverrides: Partial<Record<LiftKey, boolean>> = {};
      for (const liftKey of LIFT_ORDER) {
        const sourcePick = supplementalSourcePicks[liftKey];
        if (sourcePick !== DEFAULT_SUPPLEMENTAL_SOURCE) sourceOverrides[liftKey] = sourcePick;
        const setCountPick = supplementalSetCountPicks[liftKey];
        if (setCountPick !== DEFAULT_SUPPLEMENTAL_SET_COUNT) setCountOverrides[liftKey] = setCountPick as number;
        if (prSetOnFinalSetPicks[liftKey] === "on") prSetOverrides[liftKey] = true;
      }
      if (Object.keys(sourceOverrides).length > 0) options.supplementalSourceByLift = sourceOverrides;
      else delete options.supplementalSourceByLift;
      if (Object.keys(setCountOverrides).length > 0) options.supplementalSetCountByLift = setCountOverrides;
      else delete options.supplementalSetCountByLift;
      if (Object.keys(prSetOverrides).length > 0) options.prSetOnFinalSetByLift = prSetOverrides;
      else delete options.prSetOnFinalSetByLift;
    }

    const next: Program = {
      programmingModel,
      leaderTrainingDays,
      anchorTrainingDays: isBeginnerModel ? null : anchorTrainingDays,
      deloadTrainingDays: isBeginnerModel ? null : deloadTrainingDaysPick,
      tmTestTrainingDays: tmTestTrainingDaysPick,
      leaderTemplateId,
      anchorTemplateId,
      tmPercentage,
      options,
    };

    try {
      const oldPercentage = program?.tmPercentage;
      stateStore.saveProgram(next);

      // Rescale seeds wherever a lift's effective percentage just changed —
      // see docs/ARCHITECTURE.md §3 "Changing the percentage."
      if (oldPercentage !== undefined) {
        for (const lift of lifts) {
          const overridePick = percentageOverridePicks[lift.liftKey];
          const newOverride = overridePick === PERCENTAGE_OVERRIDE_DEFAULT ? null : (overridePick as number) / 100;
          const oldEffectivePercentage = lift.tmPercentageOverride ?? oldPercentage;
          const newEffectivePercentage = newOverride ?? tmPercentage;

          const newIncrement =
            lift.liftKey !== "squat" && lift.liftKey !== "deadlift"
              ? lift.increment
              : isBeginnerModel
                ? lift.liftKey === "squat"
                  ? squatIncrementPick
                  : deadliftIncrementPick
                : DEFAULT_INCREMENT_LB[lift.liftKey];

          const percentageChanged = oldEffectivePercentage !== newEffectivePercentage;
          const overrideFieldChanged = newOverride !== lift.tmPercentageOverride;
          const incrementChanged = newIncrement !== lift.increment;
          if (!percentageChanged && !overrideFieldChanged && !incrementChanged) continue;

          const rescaledSeed = percentageChanged
            ? rescaleTrainingMaxSeed(lift.trainingMaxSeed, oldEffectivePercentage, newEffectivePercentage)
            : lift.trainingMaxSeed;
          stateStore.saveLift({ ...lift, tmPercentageOverride: newOverride, trainingMaxSeed: rescaledSeed, increment: newIncrement });
        }
      }

      saveMessage = "Your program has been updated.";
      saveError = null;
    } catch (err) {
      saveError = err instanceof Error ? err.message : String(err);
      saveMessage = null;
    }
  }
</script>

<div class="program">
  <section>
    <h2>Programming Model</h2>
    <label class="picker-row">
      <span>Model</span>
      <select bind:value={programmingModel}>
        {#each MODEL_IDS as id}
          <option value={id}>{MODEL_LABELS[id]}</option>
        {/each}
      </select>
    </label>
  </section>

  <section>
    <h2>{isBeginnerModel ? "Training Days" : "Leader Training Days"}</h2>
    <label class="picker-row">
      <span>Days per week</span>
      <select value={leaderTrainingDays} on:change={(e) => (leaderTrainingDaysPick = Number(e.currentTarget.value) as 2 | 3 | 4)}>
        {#each leaderAvailableDayCounts as d}
          <option value={d}>{d}</option>
        {/each}
      </select>
    </label>
  </section>

  <section>
    <h2>{isBeginnerModel ? "Template" : "Leader Template"}</h2>
    <label class="picker-row">
      <span>Template</span>
      <select value={leaderTemplateId} on:change={(e) => (leaderTemplateIdPick = e.currentTarget.value)}>
        {#each leaderOptions as t}
          <option value={t.id}>{t.name}</option>
        {/each}
      </select>
    </label>

    {#if isBbbOriginalLeader}
      <details class="options">
        <summary>Options</summary>
        <label class="picker-row">
          <span>Main Work Base</span>
          <select bind:value={mainWorkBasePick}>
            {#each Object.keys(MAIN_WORK_BASE_LABELS) as base}
              <option value={base}>{MAIN_WORK_BASE_LABELS[base as MainWorkBase]}</option>
            {/each}
          </select>
        </label>
        <label class="picker-row">
          <span>Supplemental Lift</span>
          <select bind:value={supplementalLiftPick}>
            {#each SUPPLEMENTAL_LIFT_ITEMS as item}
              <option value={item.value}>{item.label}</option>
            {/each}
          </select>
        </label>
        {#each LIFT_ORDER as liftKey (liftKey)}
          <label class="picker-row">
            <span>{LIFT_LABELS[liftKey]} Supplemental %</span>
            <select bind:value={supplementalPercentPicks[liftKey]}>
              {#each SUPPLEMENTAL_PERCENT_ITEMS as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        {/each}
      </details>
    {/if}

    {#if isOriginalAbLeader}
      <details class="options">
        <summary>Options</summary>
        <label class="picker-row">
          <span>Assistance Volume</span>
          <select bind:value={assistanceProfilePick}>
            {#each ASSISTANCE_PROFILE_ITEMS as item}
              <option value={item.value}>{item.label}</option>
            {/each}
          </select>
        </label>
      </details>
    {/if}

    {#if isBeginnerModel}
      <details class="options">
        <summary>Options</summary>
        {#each LIFT_ORDER as liftKey (liftKey)}
          <label class="picker-row">
            <span>{LIFT_LABELS[liftKey]} Supplemental Source</span>
            <select bind:value={supplementalSourcePicks[liftKey]}>
              {#each SUPPLEMENTAL_SOURCE_ITEMS as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        {/each}
        {#each LIFT_ORDER as liftKey (liftKey)}
          <label class="picker-row">
            <span>{LIFT_LABELS[liftKey]} Supplemental Sets</span>
            <select bind:value={supplementalSetCountPicks[liftKey]}>
              {#each SUPPLEMENTAL_SET_COUNT_ITEMS as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        {/each}
        {#each LIFT_ORDER as liftKey (liftKey)}
          <label class="picker-row">
            <span>{LIFT_LABELS[liftKey]} PR/Goal Set</span>
            <select bind:value={prSetOnFinalSetPicks[liftKey]}>
              {#each PR_SET_ITEMS as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        {/each}
        {#if lifts.some((l) => l.liftKey === "squat")}
          <label class="picker-row">
            <span>Squat Increment</span>
            <select bind:value={squatIncrementPick}>
              {#each INCREMENT_ITEMS as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        {/if}
        {#if lifts.some((l) => l.liftKey === "deadlift")}
          <label class="picker-row">
            <span>Deadlift Increment</span>
            <select bind:value={deadliftIncrementPick}>
              {#each INCREMENT_ITEMS as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        {/if}
      </details>
    {/if}
  </section>

  {#if !isBeginnerModel}
    <section>
      <h2>7th Week Deload</h2>
      <label class="picker-row">
        <span>Days per week</span>
        <select value={deloadTrainingDaysPick} on:change={(e) => (deloadTrainingDaysPick = Number(e.currentTarget.value) as 2 | 3 | 4)}>
          {#each [2, 3, 4] as d}
            <option value={d}>{d}</option>
          {/each}
        </select>
      </label>
    </section>

    <section>
      <h2>Anchor Training Days</h2>
      <label class="picker-row">
        <span>Days per week</span>
        <select value={anchorTrainingDays} on:change={(e) => (anchorTrainingDaysPick = Number(e.currentTarget.value) as 2 | 3 | 4)}>
          {#each anchorAvailableDayCounts as d}
            <option value={d}>{d}</option>
          {/each}
        </select>
      </label>
    </section>

    <section>
      <h2>Anchor Template</h2>
      <label class="picker-row">
        <span>Template</span>
        <select value={anchorTemplateId ?? ""} on:change={(e) => (anchorTemplateIdPick = e.currentTarget.value)}>
          {#each anchorOptions as t}
            <option value={t.id}>{t.name}</option>
          {/each}
        </select>
      </label>
    </section>
  {/if}

  <section>
    <h2>7th Week TM Test</h2>
    <label class="picker-row">
      <span>Days per week</span>
      <select value={tmTestTrainingDaysPick} on:change={(e) => (tmTestTrainingDaysPick = Number(e.currentTarget.value) as 2 | 3 | 4)}>
        {#each [2, 3, 4] as d}
          <option value={d}>{d}</option>
        {/each}
      </select>
    </label>
  </section>

  <section>
    <h2>Training Max Percentage</h2>
    <label class="picker-row">
      <span>Percentage</span>
      <select value={tmPercentage} on:change={(e) => (tmPercentagePick = Number(e.currentTarget.value))}>
        {#each percentageChoices as p}
          <option value={p}>{Math.round(p * 100)}%</option>
        {/each}
      </select>
    </label>

    {#if lifts.length > 0}
      <details class="options">
        <summary>Options</summary>
        {#each LIFT_ORDER.filter((liftKey) => lifts.some((l) => l.liftKey === liftKey)) as liftKey (liftKey)}
          <label class="picker-row">
            <span>{LIFT_LABELS[liftKey]}</span>
            <select bind:value={percentageOverridePicks[liftKey]}>
              {#each PERCENTAGE_OVERRIDE_ITEMS as item}
                <option value={item.value}>{item.label}</option>
              {/each}
            </select>
          </label>
        {/each}
      </details>
    {/if}

    {#if saveMessage}
      <p class="save-message">{saveMessage}</p>
    {/if}
    {#if saveError}
      <p class="error-text">{saveError}</p>
    {/if}
    <button class="save-button" on:click={handleSave}>Save</button>
  </section>
</div>

<style>
  .program {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  h2 {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--color-secondary-label);
  }
  .picker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
  }
  select {
    flex: 0 0 auto;
    padding: var(--space-sm);
    border-radius: 6px;
    border: 1px solid var(--color-separator);
    background: var(--color-card-bg);
    color: var(--color-label);
  }
  .options {
    margin-top: var(--space-xs);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-separator);
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  .options summary {
    font-weight: 600;
    cursor: pointer;
  }
  .save-button {
    background: var(--color-blue);
    color: var(--color-on-tint);
    border: none;
    border-radius: 4px;
    padding: var(--space-md);
    font-size: 16px;
    font-weight: 600;
  }
  .save-message {
    color: var(--color-secondary-label);
    font-size: 14px;
    margin: 0;
  }
  .error-text {
    color: #ff3b30;
    font-size: 14px;
    margin: 0;
  }
</style>
