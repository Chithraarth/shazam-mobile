import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// Background screen scan. The app shares the signed-in session with the
// capture side (the iOS broadcast extension or the Android service).
// iOS: the extension records ~15s, sends the frames to /api/identify,
// notifies the user and leaves the result here for the app's History.
// Android: the service records up to 15s (the user can tap Stop sooner),
// then brings Videofy to the front with the frames waiting here; the app
// identifies them on its Identifying screen.

export type BackgroundScanResult = {
  id: string;
  // Milliseconds since epoch.
  at: number;
  // The /api/identify response.
  result: Record<string, unknown>;
  // JPEG of the first frame, base64, for the History thumbnail.
  thumbBase64: string | null;
};

type NativeModule = {
  isSupported(): boolean;
  setSession(token: string, apiBase: string, region: string): void;
  clearSession(): void;
  setAppActive(active: boolean): void;
  start(): Promise<void>;
  consumeResults(): string;
  // Android only: frames from a finished scan, as JSON, or "".
  consumePendingScan?(): string;
  // Android only: the floating Start/countdown control needs "Display over
  // other apps". iOS's broadcast picker has no such requirement.
  hasOverlayPermission?(): boolean;
  requestOverlayPermission?(): void;
};

const native = requireOptionalNativeModule<NativeModule>("VideofyBroadcast");

export function isBackgroundScanSupported(): boolean {
  return Platform.OS !== "web" && !!native?.isSupported();
}

export function setBackgroundScanSession(token: string, apiBase: string, region: string): void {
  native?.setSession(token, apiBase, region);
}

export function clearBackgroundScanSession(): void {
  native?.clearSession();
}

// The capture side ignores the screen while Videofy itself is showing.
export function setBackgroundScanAppActive(active: boolean): void {
  native?.setAppActive(active);
}

// Android only: whether "Display over other apps" is granted, needed for
// the floating Start/countdown control. Always true on iOS.
export function hasBackgroundScanOverlayPermission(): boolean {
  if (Platform.OS !== "android") return true;
  return native?.hasOverlayPermission?.() ?? false;
}

// Android only: sends the user to the system settings screen to grant
// "Display over other apps" — Android has no runtime dialog for this one.
export function requestBackgroundScanOverlayPermission(): void {
  if (Platform.OS !== "android") return;
  native?.requestOverlayPermission?.();
}

// iOS: opens the system "Start Broadcast" sheet. Android: asks for screen
// capture permission (after the overlay permission is granted) and starts
// the scan service.
export async function startBackgroundScan(): Promise<void> {
  if (!native) throw new Error("Background scan isn't available in this build.");
  await native.start();
}

export type BackgroundScanCapture = {
  // Milliseconds since epoch.
  at: number;
  // file:// URI of the first frame, for display.
  uri: string;
  // JPEG frames, base64: the first, then the rest.
  base64: string;
  extraFrames: string[];
};

// Android only: frames the scan service captured and handed to the app.
// Returned once; null when there are none.
export function consumeBackgroundScanCapture(): BackgroundScanCapture | null {
  if (Platform.OS !== "android" || !native?.consumePendingScan) return null;
  try {
    const raw = native.consumePendingScan();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BackgroundScanCapture;
    return parsed?.base64 ? parsed : null;
  } catch {
    return null;
  }
}

export function consumeBackgroundScanResults(): BackgroundScanResult[] {
  if (!native) return [];
  try {
    const parsed = JSON.parse(native.consumeResults() || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
