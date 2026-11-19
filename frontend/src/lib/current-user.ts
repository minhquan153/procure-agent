"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import type { User } from "@/types/api";

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    apiRequest<User>("/auth/me")
      .then((result) => { if (active) setUser(result); })
      .catch((cause: Error) => { if (active) setError(cause.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return { user, userId: user?.id ?? "", users: user ? [user] : [], loading, error };
}
