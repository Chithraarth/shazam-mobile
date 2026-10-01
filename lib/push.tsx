import {
  AuthorizationStatus,
  deleteToken,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  requestPermission,
} from "@react-native-firebase/messaging";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useCallback, useEffect } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { useAuthedFetch } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings";

const messaging = () => getMessaging();
const platform = Platform.OS === "ios" ? "ios" : "android";

async function askPermission(): Promise<boolean> {
  if (Platform.OS === "android") {
    if (Number(Platform.Version) < 33) return true;
    const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    return res === PermissionsAndroid.RESULTS.GRANTED;
  }
  const status = await requestPermission(messaging());
  return status === AuthorizationStatus.AUTHORIZED || status === AuthorizationStatus.PROVISIONAL;
}

export function usePushControls() {
  const authedFetch = useAuthedFetch();
  const { update } = useSettings();

  const register = useCallback(async () => {
    const token = await getToken(messaging());
    await authedFetch("/api/user/push-token", { method: "POST", body: JSON.stringify({ token, platform }) });
  }, [authedFetch]);

  // Asks the OS for permission; returns whether notifications are now on.
  const enable = useCallback(async () => {
    const granted = await askPermission().catch(() => false);
    update({ pushEnabled: granted });
    if (granted) await register().catch(() => {});
    return granted;
  }, [register, update]);

  // Stops payment notifications for this install (also used before sign-out).
  const disable = useCallback(async (keepSetting = false) => {
    try {
      const token = await getToken(messaging());
      await authedFetch("/api/user/push-token", { method: "DELETE", body: JSON.stringify({ token }) });
      if (!keepSetting) await deleteToken(messaging());
    } catch {
      /* best effort */
    }
    if (!keepSetting) update({ pushEnabled: false });
  }, [authedFetch, update]);

  return { register, enable, disable };
}

// Mounted once at the root: keeps the server's copy of this install's token
// current and routes taps on payment notifications to Purchases.
export function PushManager() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isSignedIn, user } = useAuth();
  const { settings } = useSettings();
  const { register } = usePushControls();
  const authedFetch = useAuthedFetch();

  useEffect(() => {
    if (!isSignedIn || !settings.pushEnabled) return;
    register().catch(() => {});
    return onTokenRefresh(messaging(), (token) => {
      authedFetch("/api/user/push-token", { method: "POST", body: JSON.stringify({ token, platform }) }).catch(() => {});
    });
  }, [isSignedIn, user?.uid, settings.pushEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const open = (data?: Record<string, unknown>) => {
      if (data?.type === "credited" || data?.type === "refunded") router.push("/purchases");
    };
    getInitialNotification(messaging()).then((m) => open(m?.data)).catch(() => {});
    const unsubOpened = onNotificationOpenedApp(messaging(), (m) => open(m.data));
    // In the foreground the system doesn't show the notification; just
    // refresh the balance so the new scans appear straight away.
    const unsubMessage = onMessage(messaging(), () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
    });
    return () => { unsubOpened(); unsubMessage(); };
  }, [router, queryClient]);

  return null;
}
