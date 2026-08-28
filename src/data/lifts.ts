// Reads and writes public.lifts. Returns generator-shaped values — see
// docs/ARCHITECTURE.md §4: "data/ ... returns rows[, and] may import types
// from generator/types.ts."

import type { Lift, LiftKey, LiftRole } from "@/generator/types";

import { supabase } from "./supabase";

const LIFT_COLUMNS = "lift_key, role, training_max_seed_lb, tm_percentage_override, increment_lb";

/**
 * The shape a SELECT actually returns — not the shape the columns are
 * declared as. Postgres `numeric` comes back over PostgREST as a JSON
 * *string*, to avoid float precision loss, regardless of what the column
 * type suggests. Trusting the declared type here silently corrupts every
 * calculation downstream (string + number is concatenation, not addition).
 */
interface LiftRow {
  lift_key: LiftKey;
  role: LiftRole;
  training_max_seed_lb: string;
  tm_percentage_override: string | null;
  increment_lb: string;
}

function rowToLift(row: LiftRow): Lift {
  return {
    liftKey: row.lift_key,
    role: row.role,
    trainingMaxSeed: Number(row.training_max_seed_lb),
    tmPercentageOverride: row.tm_percentage_override === null ? null : Number(row.tm_percentage_override),
    increment: Number(row.increment_lb),
  };
}

interface LiftWriteRow {
  user_id: string;
  lift_key: LiftKey;
  role: LiftRole;
  training_max_seed_lb: number;
  tm_percentage_override: number | null;
  increment_lb: number;
}

function liftToRow(userId: string, lift: Lift): LiftWriteRow {
  return {
    user_id: userId,
    lift_key: lift.liftKey,
    role: lift.role,
    training_max_seed_lb: lift.trainingMaxSeed,
    tm_percentage_override: lift.tmPercentageOverride,
    increment_lb: lift.increment,
  };
}

/** All of the signed-in user's lifts. RLS scopes this to their own rows. */
export async function getLifts(): Promise<Lift[]> {
  const { data, error } = await supabase.from("lifts").select(LIFT_COLUMNS);
  if (error) throw error;
  return ((data ?? []) as LiftRow[]).map(rowToLift);
}

/**
 * Insert or update one lift, keyed by (user_id, lift_key) — the unique
 * constraint the table declares. Fails loudly on error rather than queuing
 * or retrying; see docs/ARCHITECTURE.md §4 "Writes offline."
 */
export async function upsertLift(userId: string, lift: Lift): Promise<void> {
  const { error } = await supabase.from("lifts").upsert(liftToRow(userId, lift), { onConflict: "user_id,lift_key" });
  if (error) throw error;
}
