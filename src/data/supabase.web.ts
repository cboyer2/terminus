import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

const isSSR = typeof window === "undefined";

const ExpoWebSecureStoreAdapter = {
  getItem: (key: string) => {
    if (isSSR) return null;
    return AsyncStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (isSSR) return;
    return AsyncStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (isSSR) return;
    return AsyncStorage.removeItem(key);
  },
};

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv(
  "EXPO_PUBLIC_SUPABASE_URL",
  process.env.EXPO_PUBLIC_SUPABASE_URL,
);
const supabaseKey = requireEnv(
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: ExpoWebSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
