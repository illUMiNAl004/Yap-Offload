"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Browser Supabase client. Null if env isn't configured (keeps local mode working). */
export const supabase = url && anon ? createBrowserClient(url, anon) : null;

export const supabaseReady = Boolean(supabase);
