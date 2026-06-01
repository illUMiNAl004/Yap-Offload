"use client";

import { AuthProvider, useAuth, isOnboarded } from "@/lib/auth";
import { supabaseReady } from "@/lib/supabase";
import RecordProvider from "@/components/RecordProvider";
import FocusSoundProvider from "@/components/FocusSoundProvider";
import TopBar from "@/components/TopBar";
import MemoryRibbon from "@/components/MemoryRibbon";
import SignIn from "@/components/SignIn";
import Onboarding from "@/components/Onboarding";

function Gate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (supabaseReady && loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="font-serif text-2xl italic text-muted">yapload…</span>
      </div>
    );
  }

  if (supabaseReady && !user) return <SignIn />;

  if (supabaseReady && user && !isOnboarded(user)) return <Onboarding />;

  return (
    <RecordProvider>
      <FocusSoundProvider>
        <div className="flex min-h-screen flex-col">
          <TopBar />
          <div className="flex-1">{children}</div>
          <MemoryRibbon />
        </div>
      </FocusSoundProvider>
    </RecordProvider>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Gate>{children}</Gate>
    </AuthProvider>
  );
}
