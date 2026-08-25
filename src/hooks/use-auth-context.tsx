import type { JwtPayload } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

export type AuthData = {
  claims?: JwtPayload | null;
  isLoading: boolean;
  isLoggedIn: boolean;
};

export const AuthContext = createContext<AuthData>({
  claims: undefined,
  isLoading: true,
  isLoggedIn: false,
});

export const useAuthContext = () => useContext(AuthContext);
