import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import {
  clearBackgroundScanSession,
  consumeBackgroundScanCapture,
  consumeBackgroundScanResults,
  isBackgroundScanSupported,
  setBackgroundScanAppActive,
  setBackgroundScanSession,
} from "videofy-broadcast";
import { apiBase } from "@/hooks/useProfile";
import { deviceRegion } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useHistory } from "@/lib/history-store";
import { setPendingFrame } from "@/lib/scan-session";
import type { IdentifyResult } from "@/lib/scan-types";

// A result this recent was most likely opened from its notification, so the
// app goes straight to it.
const OPEN_IF_NEWER_THAN_MS = 5 * 60 * 1000;
// Android scan frames older than this are dropped rather than identified
// out of the blue the next time the app opens.
const CAPTURE_FRESH_MS = 10 * 60 * 1000;

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

    // Android: the scan service brings Videofy to the front with its frames
    // waiting; identify them on the usual Identifying screen.
    const identifyCapture = () => {
      const capture = consumeBackgroundScanCapture();
      if (!capture || Date.now() - capture.at > CAPTURE_FRESH_MS) return;
      setPendingFrame({ uri: capture.uri, base64: capture.base64, extraFrames: capture.extraFrames, source: "screen" });
      router.push("/identifying");
    };

    setBackgroundScanAppActive(AppState.currentState === "active");
    shareSession();
    if (loaded) {
      importResults(false);
      identifyCapture();
    }

    const sub = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setBackgroundScanAppActive(active);
      shareSession();
      if (active && loaded) {
        importResults(true);
        identifyCapture();
      }
    });
    return () => sub.remove();
  }, [user?.uid, loaded, add, router, queryClient]);

  return null;
}
