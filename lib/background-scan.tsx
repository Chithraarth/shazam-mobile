import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  clearBackgroundScanSession,
  consumeBackgroundScanResults,
  isBackgroundScanSupported,
  setBackgroundScanAppActive,
  setBackgroundScanSession,
} from "videofy-broadcast";
import { apiBase } from "@/hooks/useProfile";
import { deviceRegion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useHistory } from "@/lib/history-store";
import type { IdentifyResult } from "@/lib/scan-types";

// A result this recent was most likely opened from its notification, so the
// app goes straight to it.
const OPEN_IF_NEWER_THAN_MS = 5 * 60 * 1000;

// Keeps the background scan's capture side (iOS broadcast extension /
// Android service) in sync with the app: the signed-in session, whether
// Videofy is on screen, and finished scans, which are added to History.
export function BackgroundScanSync() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { add, loaded } = useHistory();
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!isBackgroundScanSupported()) return;

    // ID tokens last an hour; refreshing on every app switch keeps the one
    // the extension uses valid for a scan started from here.
    const shareSession = async () => {
      const u = userRef.current;
      if (!u) return clearBackgroundScanSession();
      try {
        setBackgroundScanSession(await u.getIdToken(), apiBase(), deviceRegion());
      } catch {
        /* keep the previous token */
      }
    };

    const importResults = async (navigate: boolean) => {
      const results = consumeBackgroundScanResults();
      if (!results.length) return;
      results.sort((a, b) => b.at - a.at);
      let newest: string | null = null;
      for (const r of [...results].reverse()) {
        const item = await add(r.result as unknown as IdentifyResult, r.thumbBase64);
        newest = item.id;
      }
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      if (navigate && newest && Date.now() - results[0].at < OPEN_IF_NEWER_THAN_MS) {
        router.push({ pathname: "/result", params: { id: newest, fresh: "1" } });
      }
    };

    setBackgroundScanAppActive(AppState.currentState === "active");
    shareSession();
    if (loaded) importResults(false);

    const sub = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setBackgroundScanAppActive(active);
      shareSession();
      if (active && loaded) importResults(true);
    });
    return () => sub.remove();
  }, [user?.uid, loaded, add, router, queryClient]);

  return null;
}
