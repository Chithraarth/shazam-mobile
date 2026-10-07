import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { emitSessionExpired } from "@/lib/session-events";

export function apiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

const REQUEST_TIMEOUT_MS = 15000;

// Without this, a stalled getIdToken() refresh or a hung network request
// leaves react-query's isLoading stuck true forever, which the (tabs) guard
// treats as "still checking" with no path to the existing error/retry screen.
function withTimeout<T>(promise: Promise<T>, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), REQUEST_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export type Profile = {
  id: string;
  email: string | null;
  scansRemaining: number;
  // StoreKit appAccountToken for iOS purchases (derived from the user ID).
  appAccountToken?: string;
  country: string | null;
  language: string | null;
  contentRegions: string[];
  onboardingComplete: boolean;
};

export function useAuthedFetch() {
  const { user } = useAuth();
  return useCallback(
    async (path: string, init?: RequestInit & { timeoutMs?: number }) => {
      const { timeoutMs = REQUEST_TIMEOUT_MS, ...fetchInit } = init ?? {};
      const token = user
        ? await withTimeout(user.getIdToken(), "Timed out refreshing your sign-in")
        : undefined;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetch(`${apiBase()}${path}`, {
          ...fetchInit,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...(fetchInit.headers as Record<string, string>),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (res.status === 401 && token) emitSessionExpired();
        return res;
      } finally {
        clearTimeout(timer);
      }
    },
    [user]
  );
}

export function useProfile() {
  const { isSignedIn } = useAuth();
  const authedFetch = useAuthedFetch();
  return useQuery<Profile>({
    queryKey: ["profile"],
    enabled: !!isSignedIn,
    retry: 1,
    queryFn: async () => {
      const res = await authedFetch("/api/user/me");
      if (!res.ok) throw new Error(`Failed to load profile (${res.status})`);
      return res.json();
    },
  });
}

export function useSavePreferences() {
  const authedFetch = useAuthedFetch();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (prefs: { country: string; language: string; contentRegions: string[] }) => {
      const res = await authedFetch("/api/user/preferences", {
        method: "PUT",
        body: JSON.stringify(prefs),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? "Failed to save preferences");
      }
      return res.json() as Promise<Profile>;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(["profile"], profile);
    },
  });
}
