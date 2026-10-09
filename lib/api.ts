import { useQuery } from "@tanstack/react-query";
import * as Application from "expo-application";
import * as Localization from "expo-localization";
import { Platform } from "react-native";
import { apiBase, useAuthedFetch } from "@/hooks/useProfile";
import type { IdentifyResult } from "@/lib/scan-types";

const deviceRegion = () => Localization.getLocales()[0]?.regionCode ?? "IN";

export class ApiError extends Error {
  constructor(readonly code: "out_of_scans" | "unauthorized" | "failed" | "offline", message: string) {
    super(message);
  }
}

const IDENTIFY_TIMEOUT_MS = 60_000;

export function useIdentify() {
  const authedFetch = useAuthedFetch();
  return async (imageData: string, extraFrames?: string[]): Promise<IdentifyResult> => {
    let res: Response;
    try {
      res = await authedFetch("/api/identify", {
        method: "POST",
        body: JSON.stringify({ imageData, extraFrames, mimeType: "image/jpeg", region: deviceRegion() }),
        // Identification usually takes 10–20s (AI call plus catalog lookup),
        // far longer than ordinary requests.
        timeoutMs: IDENTIFY_TIMEOUT_MS,
      });
    } catch (err) {
      // The server refunds the scan if we hang up before it answers.
      if ((err as { name?: string })?.name === "AbortError") {
        throw new ApiError("failed", "That took longer than usual. Your scan wasn’t used — please try again.");
      }
      throw new ApiError("offline", "We couldn’t reach Videofy. Check your connection — nothing was charged.");
    }
    if (res.status === 402) throw new ApiError("out_of_scans", "You’re out of scans.");
    if (res.status === 401) throw new ApiError("unauthorized", "Please sign in again.");
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      throw new ApiError("failed", data.message ?? "Something went wrong on our side. Your scan wasn’t used.");
    }
    return res.json();
  };
}

export type PurchaseRecord = {
  id: number;
  productId: string;
  platform: "android" | "ios";
  scansGranted: number;
  createdAt: string;
  refunded: boolean;
};

export function usePurchases() {
  const authedFetch = useAuthedFetch();
  return useQuery<PurchaseRecord[]>({
    queryKey: ["purchases"],
    queryFn: async () => {
      const res = await authedFetch("/api/billing/purchases");
      if (!res.ok) throw new Error("Couldn’t load your purchases.");
      return res.json();
    },
  });
}

export function useDeleteAccountRequest() {
  const authedFetch = useAuthedFetch();
  return async () => {
    const res = await authedFetch("/api/user/me", { method: "DELETE" });
    if (!res.ok) throw new Error("Couldn’t delete your account. Please try again.");
  };
}

export type PersonInfo = {
  id: number;
  name: string;
  profileUrl: string | null;
  knownFor: { id: number; mediaType: "movie" | "tv"; title: string; year: number | null; posterUrl: string | null; character: string | null }[];
};

export function usePerson(id: number | null | undefined) {
  const authedFetch = useAuthedFetch();
  return useQuery<PersonInfo>({
    queryKey: ["person", id],
    enabled: !!id,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const res = await authedFetch(`/api/catalog/person/${id}`);
      if (!res.ok) throw new Error("Couldn’t load this person.");
      return res.json();
    },
  });
}

export type SeasonInfo = {
  season: number;
  episodes: { number: number; name: string; overview: string | null; airDate: string | null; runtime: number | null; stillUrl: string | null }[];
};

export function useSeason(tvId: number | null | undefined, season: number | null | undefined) {
  const authedFetch = useAuthedFetch();
  return useQuery<SeasonInfo>({
    queryKey: ["season", tvId, season],
    enabled: !!tvId && season != null,
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async () => {
      const res = await authedFetch(`/api/catalog/tv/${tvId}/season/${season}`);
      if (!res.ok) throw new Error("Couldn’t load episodes.");
      return res.json();
    },
  });
}

type AppConfig = { minAndroidVersionCode?: number; minIosBuild?: number };

// True when the backend says this build is too old to keep using.
export function useUpdateRequired(): boolean {
  const { data } = useQuery<AppConfig>({
    queryKey: ["app-config"],
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const res = await fetch(`${apiBase()}/api/app-config`);
      if (!res.ok) return {};
      return res.json();
    },
  });
  const build = Number(Application.nativeBuildVersion ?? 0);
  if (!data || !build) return false;
  const min = Platform.OS === "android" ? data.minAndroidVersionCode : data.minIosBuild;
  return typeof min === "number" && build < min;
}
