import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function apiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : "";
}

export type Profile = {
  id: string;
  email: string | null;
  hasActiveSubscription: boolean;
  country: string | null;
  language: string | null;
  contentRegions: string[];
  onboardingComplete: boolean;
};

export function useAuthedFetch() {
  const { user } = useAuth();
  return useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await user?.getIdToken();
      return fetch(`${apiBase()}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          ...(init?.headers as Record<string, string>),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
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
