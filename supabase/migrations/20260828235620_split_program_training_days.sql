-- Splits program.training_days into four independent day-count choices:
-- the Leader phase, the Anchor phase, the mid-plan 7th Week deload, and the
-- closing 7th Week TM test (also covers a future PR test, per PRD, though
-- that variant isn't generated yet). The book allows all four to differ —
-- a 3-day Leader into a 4-day Anchor (e.g. Original 5/3/1 A/B into the
-- canonical Original 5/3/1), and separately lets each 7th Week Protocol
-- occurrence run at 2, 3, or 4 days regardless of either phase or the
-- other 7th-week occurrence. See docs/ARCHITECTURE.md §3 and
-- docs/plan-structure.md "Placement rules".

alter table public.program
  rename column training_days to leader_training_days;

alter table public.program
  rename constraint program_training_days_check to program_leader_training_days_check;

alter table public.program
  add column anchor_training_days int,
  add column deload_training_days int,
  add column tm_test_training_days int;

-- Backfill: training_days previously served the Leader phase, the Anchor
-- phase, and both 7th Week Protocol occurrences all at once.
update public.program
set anchor_training_days = leader_training_days,
    deload_training_days = leader_training_days
where anchor_template_id is not null;

update public.program
set tm_test_training_days = leader_training_days;

alter table public.program
  alter column tm_test_training_days set not null;

alter table public.program
  add constraint program_anchor_training_days_check check (anchor_training_days between 2 and 4),
  add constraint program_deload_training_days_check check (deload_training_days between 2 and 4),
  add constraint program_tm_test_training_days_check check (tm_test_training_days between 2 and 4);

alter table public.program
  drop constraint program_check;

alter table public.program
  add constraint program_check check (
    (programming_model = 'beginner') = (anchor_template_id is null)
    and (anchor_template_id is null) = (anchor_training_days is null)
    and (anchor_template_id is null) = (deload_training_days is null)
  );

comment on column public.program.leader_training_days is
  'Training days for the Leader phase — also the standalone template''s day count when programming_model is beginner.';
comment on column public.program.anchor_training_days is
  'Training days for the Anchor phase. Null exactly when anchor_template_id is null (programming_model = beginner).';
comment on column public.program.deload_training_days is
  'Training days for the mid-plan 7th Week deload, between the Leader and Anchor phases. Null exactly when anchor_template_id is null (no phase transition, so no deload).';
comment on column public.program.tm_test_training_days is
  'Training days for the closing 7th Week TM test (or a future PR test). Always set — every plan closes with one, independent of every other day-count choice.';
