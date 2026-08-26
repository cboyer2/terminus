-- Lifts and program: the only stored state in Terminus. No plan, position,
-- or history is persisted — see docs/ARCHITECTURE.md §3.

create table public.lifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  lift_key text not null check (lift_key in ('squat', 'bench', 'press', 'deadlift')),
  role text not null check (role in ('main', 'supplemental')),
  training_max_seed_lb numeric not null check (training_max_seed_lb > 0),
  tm_percentage_override numeric check (
    tm_percentage_override > 0 and tm_percentage_override <= 1
  ),
  increment_lb numeric not null check (increment_lb > 0),
  unique (user_id, lift_key)
);

comment on table public.lifts is
  'Per-lift stored inputs: training max seed, increment, optional TM percentage override. One row per lift_key per user.';
comment on column public.lifts.lift_key is
  'Stable identifier the generator keys on. Constrained to the lifts current templates reference; widen this check when a template introduces a new one.';
comment on column public.lifts.tm_percentage_override is
  'Per-lift override of program.tm_percentage. Never a per-phase override — see docs/ARCHITECTURE.md.';

alter table public.lifts enable row level security;

create policy "lifts_select_own" on public.lifts
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "lifts_insert_own" on public.lifts
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "lifts_update_own" on public.lifts
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "lifts_delete_own" on public.lifts
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create table public.program (
  user_id uuid primary key references auth.users (id) on delete cascade,
  programming_model text not null check (
    programming_model in ('beginner', '2+1', '2+2', '3+2')
  ),
  training_days int not null check (training_days between 2 and 4),
  leader_template_id text not null,
  anchor_template_id text,
  tm_percentage numeric not null check (tm_percentage > 0 and tm_percentage <= 1),
  options jsonb not null default '{}'::jsonb,
  check (
    (programming_model = 'beginner') = (anchor_template_id is null)
  )
);

comment on table public.program is
  'One row per user: programming model, template selection, plan-wide TM percentage, and template options. Singular by design — a user has exactly one plan, never a history of them.';
comment on column public.program.leader_template_id is
  'References a template record in generator/templates/*.ts, not a table — the library is code, not user-authored. Also holds the standalone template id when programming_model is beginner.';
comment on column public.program.tm_percentage is
  'Plan-wide, driven by the Leader template. Never role-keyed — see docs/ARCHITECTURE.md.';

alter table public.program enable row level security;

create policy "program_select_own" on public.program
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "program_insert_own" on public.program
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "program_update_own" on public.program
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "program_delete_own" on public.program
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
