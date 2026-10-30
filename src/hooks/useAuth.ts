import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";

export function useAuth() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(next);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return { session, recovery, endRecovery: () => setRecovery(false) };
}
