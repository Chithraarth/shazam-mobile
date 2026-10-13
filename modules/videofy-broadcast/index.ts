import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

// Background screen scan. The app shares the signed-in session with the
// capture side (the iOS broadcast extension or the Android service); that
// side records the screen for ~15s once Videofy is in the background, sends
// the frames to /api/identify, notifies the user and leaves the result here
// for the app to add to History.

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

// iOS: opens the system "Start Broadcast" sheet. Android: asks for screen
// capture permission and starts the scan service.
export async function startBackgroundScan(): Promise<void> {
  if (!native) throw new Error("Background scan isn't available in this build.");
  await native.start();
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
