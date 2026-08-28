import { createClient } from "@supabase/supabase-js";
import { AFTER_FIRST_UNLOCK, deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";

// AFTER_FIRST_UNLOCK, not the WHEN_UNLOCKED default: Supabase's background
// auto-refresh timer reads the session on a fixed interval regardless of
// whether the device is actively unlocked. WHEN_UNLOCKED throws
// "User interaction is not allowed" the moment that tick fires while the
// phone is locked; AFTER_FIRST_UNLOCK still requires one unlock since boot,
// but permits background access after that, matching how a session token
// actually gets used.
const KEYCHAIN_OPTIONS = { keychainAccessible: AFTER_FIRST_UNLOCK };

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    return getItemAsync(key, KEYCHAIN_OPTIONS);
  },
  setItem: (key: string, value: string) => {
    if (value.length > 2048) {
      console.warn(
        "Value being stored in SecureStore is larger than 2048 bytes and it may not be stored successfully. In a future SDK version, this call may throw an error.",
      );
    }
    return setItemAsync(key, value, KEYCHAIN_OPTIONS);
  },
  removeItem: (key: string) => {
    return deleteItemAsync(key, KEYCHAIN_OPTIONS);
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
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
