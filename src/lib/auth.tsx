"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { captureGoogleRefreshToken } from "@/lib/google";

const GOOGLE_SYNC_SCOPES =
  "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/tasks";

type AuthState = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  connectGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<{ needsConfirm: boolean }>;
  setName: (name: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  connectGoogle: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => ({ needsConfirm: false }),
  setName: async () => {},
  signOut: async () => {},
});

/** The name the user wants to be called (custom, falling back to Google's). */
export function displayName(user: { user_metadata?: Record<string, unknown> } | null): string {
  const m = user?.user_metadata ?? {};
  return (
    (typeof m.name === "string" && m.name) ||
    (typeof m.full_name === "string" && (m.full_name as string).split(" ")[0]) ||
    ""
  );
}

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      // if we just returned from connecting Google, stash the refresh token
      if (session?.provider_refresh_token) captureGoogleRefreshToken(session);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  };

  // Connect Google with Calendar + Tasks scopes (offline → long-lived refresh token)
  const connectGoogle = async () => {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes: GOOGLE_SYNC_SCOPES,
        redirectTo: window.location.href,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (!supabase) return;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (!supabase) return { needsConfirm: false };
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    // if no session came back, email confirmation is required
    return { needsConfirm: !data.session };
  };

  const setName = async (name: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.auth.updateUser({ data: { name: name.trim() } });
    if (error) throw error;
    if (data.user) setUser(data.user);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  return (
    <Ctx.Provider
      value={{ user, loading, signInWithGoogle, connectGoogle, signInWithEmail, signUpWithEmail, setName, signOut }}
    >
      {children}
    </Ctx.Provider>
  );
}
