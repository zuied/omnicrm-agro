"use client";

import React from "react";
import type { SessionUser } from "@/lib/types";

let cachedUser: SessionUser | null | undefined;
let cachePromise: Promise<SessionUser | null> | null = null;

async function fetchMe(): Promise<SessionUser | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as SessionUser;
  } catch {
    return null;
  }
}

/** Hook client untuk membaca user dari sesi (di-cache global). */
export function useSessionUser(): SessionUser | null {
  const [user, setUser] = React.useState<SessionUser | null | undefined>(cachedUser);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (cachePromise === null) cachePromise = fetchMe();
      const u = await cachePromise;
      cachedUser = u;
      if (alive) setUser(u);
    })();
    return () => {
      alive = false;
    };
  }, []);

  return user ?? null;
}