import { useShareIntentContext } from "expo-share-intent";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";
import { prepareImage } from "@/lib/image";
import { setPendingFrame } from "@/lib/scan-session";
import { updateScanWidget } from "@/widget/state";

// "Share → Videofy" from another app: identify the shared screenshot once
// the user is signed in and set up.
export function ShareIntentHandler() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { data: profile } = useProfile();
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const ready = isSignedIn && !!profile?.onboardingComplete;

  useEffect(() => {
    if (!hasShareIntent || !ready || !profile) return;
    const file = shareIntent.files?.find((f) => f.mimeType?.startsWith("image/"));
    resetShareIntent();
    if (!file) return;
    if (profile.scansRemaining <= 0) {
      router.push("/paywall");
      return;
    }
    const uri = file.path.startsWith("/") ? `file://${file.path}` : file.path;
    prepareImage(uri, file.width ?? undefined, file.height ?? undefined)
      .then((frame) => {
        setPendingFrame({ ...frame, source: "photo" });
        router.push("/identifying");
      })
      .catch(() => {});
  }, [hasShareIntent, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// Keeps the Android home-screen widget's "N left" in sync with the account.
export function WidgetSync() {
  const { isSignedIn } = useAuth();
  const { data: profile } = useProfile();
  const left = isSignedIn ? profile?.scansRemaining ?? null : null;
  useEffect(() => {
    updateScanWidget(left);
  }, [left]);
  return null;
}
