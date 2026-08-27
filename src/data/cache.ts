// AsyncStorage-backed read cache for offline — not SecureStore, which is
// reserved for session tokens (docs/ARCHITECTURE.md §4). Mirrors the
// last-fetched lifts + program so the app can render immediately on load
// and reconcile with a live fetch after. There is nothing to cache for the
// plan itself: it's derived, never persisted.

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Lift, Program } from "@/generator/types";

const LIFTS_CACHE_KEY = "terminus:cache:lifts";
const PROGRAM_CACHE_KEY = "terminus:cache:program";

export async function getCachedLifts(): Promise<Lift[] | null> {
  const raw = await AsyncStorage.getItem(LIFTS_CACHE_KEY);
  return raw ? (JSON.parse(raw) as Lift[]) : null;
}

export async function setCachedLifts(lifts: Lift[]): Promise<void> {
  await AsyncStorage.setItem(LIFTS_CACHE_KEY, JSON.stringify(lifts));
}

export async function getCachedProgram(): Promise<Program | null> {
  const raw = await AsyncStorage.getItem(PROGRAM_CACHE_KEY);
  return raw ? (JSON.parse(raw) as Program) : null;
}

export async function setCachedProgram(program: Program): Promise<void> {
  await AsyncStorage.setItem(PROGRAM_CACHE_KEY, JSON.stringify(program));
}
