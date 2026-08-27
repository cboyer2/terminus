// Reads and writes the signed-in user's one public.program row. Returns
// generator-shaped values — see docs/ARCHITECTURE.md §4.

import type { Program, ProgrammingModelId, TemplateId } from "@/generator/types";

import { supabase } from "./supabase";

const PROGRAM_COLUMNS = "programming_model, training_days, leader_template_id, anchor_template_id, tm_percentage, options";

interface ProgramRow {
  programming_model: ProgrammingModelId;
  training_days: 2 | 3 | 4;
  leader_template_id: TemplateId;
  anchor_template_id: TemplateId | null;
  tm_percentage: number;
  options: Record<string, unknown>;
}

function rowToProgram(row: ProgramRow): Program {
  return {
    programmingModel: row.programming_model,
    trainingDays: row.training_days,
    leaderTemplateId: row.leader_template_id,
    anchorTemplateId: row.anchor_template_id,
    tmPercentage: row.tm_percentage,
    options: row.options,
  };
}

function programToRow(userId: string, program: Program): ProgramRow & { user_id: string } {
  return {
    user_id: userId,
    programming_model: program.programmingModel,
    training_days: program.trainingDays,
    leader_template_id: program.leaderTemplateId,
    anchor_template_id: program.anchorTemplateId,
    tm_percentage: program.tmPercentage,
    options: program.options,
  };
}

/**
 * The signed-in user's one program row, or null before setup has happened.
 * `program` is keyed by user_id alone (docs/ARCHITECTURE.md §3) — there is
 * exactly one row per user, never a history of them.
 */
export async function getProgram(): Promise<Program | null> {
  const { data, error } = await supabase.from("program").select(PROGRAM_COLUMNS).maybeSingle();
  if (error) throw error;
  return data ? rowToProgram(data as ProgramRow) : null;
}

/**
 * Insert or update the signed-in user's one program row. Fails loudly on
 * error rather than queuing or retrying; see docs/ARCHITECTURE.md §4
 * "Writes offline."
 */
export async function setProgram(userId: string, program: Program): Promise<void> {
  const { error } = await supabase.from("program").upsert(programToRow(userId, program));
  if (error) throw error;
}
