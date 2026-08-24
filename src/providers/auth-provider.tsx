import { supabase } from "@/data/supabase";
import { AuthContext } from "@/hooks/use-auth-context";
import * as Linking from "expo-linking";
import { PropsWithChildren, useEffect, useState } from "react";

function handleDeepLink(url: string) {
  const fragment = url.split("#")[1] ?? "";
  const params = new URLSearchParams(fragment);
  const access_token = params.get("access_token");
  const refresh_token = params.get("refresh_token");

  if (access_token && refresh_token) {
    supabase.auth.setSession({ access_token, refresh_token });
  }
}

export default function AuthProvider({ children }: PropsWithChildren) {
  const [claims, setClaims] = useState<
    Record<string, any> | undefined | null
  >();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch the claims once, and subscribe to auth state changes
  useEffect(() => {
    const fetchClaims = async () => {
      setIsLoading(true);

      const { data, error } = await supabase.auth.getClaims();

      if (error) {
        console.error("Error fetching claims:", error);
      }

      setClaims(data?.claims ?? null);
      setIsLoading(false);
    };

    fetchClaims();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, _session) => {
      console.log("Auth state changed:", { event: _event });
      const { data } = await supabase.auth.getClaims();
      setClaims(data?.claims ?? null);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        claims,
        isLoading,
        isLoggedIn: claims != undefined,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
