import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, AppState, Platform, View } from "react-native";
import {
  hasBackgroundScanOverlayPermission,
  isBackgroundScanSupported,
  requestBackgroundScanOverlayPermission,
  startBackgroundScan,
} from "videofy-broadcast";
import { useProfile } from "@/hooks/useProfile";
import { Button, Card, Gradient, Screen, TopBar, Txt } from "@/ui/components";

// Background scan: after granting permission, Videofy shows a floating
// "Start scan" button over whatever app you're in. Navigate to the video
// first, then tap it — Videofy watches for 15 seconds and sends you the
// answer as a notification.
export default function BackgroundScan() {
  const router = useRouter();
  const { data: profile } = useProfile();
  const [starting, setStarting] = useState(false);
  const supported = isBackgroundScanSupported();
  // Set while the user is in Android settings granting "Display over other
  // apps", so the scan carries on by itself when they come back.
  const awaitingOverlay = useRef(false);

  const start = async () => {
    if ((profile?.scansRemaining ?? 0) <= 0) {
      router.push("/paywall");
      return;
    }
    if (Platform.OS === "android" && !hasBackgroundScanOverlayPermission()) {
      Alert.alert(
        "One more permission",
        "Videofy shows a small Start button over the app you’re watching. On the next screen, turn on “Allow display over other apps” for Videofy, then come back.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Continue",
            onPress: () => {
              awaitingOverlay.current = true;
              requestBackgroundScanOverlayPermission();
            },
          },
        ],
      );
      return;
    }
    setStarting(true);
    try {
      await startBackgroundScan();
    } catch (e) {
      Alert.alert("Couldn’t start the scan", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !awaitingOverlay.current) return;
      awaitingOverlay.current = false;
      if (hasBackgroundScanOverlayPermission()) start();
    });
    return () => sub.remove();
  }); // re-subscribes each render so `start` sees the latest profile

  const steps =
    Platform.OS === "ios"
      ? ["Tap Start, choose Videofy, then Start Broadcast", "Open the video you want to identify", "Get the answer as a notification in about 30 seconds"]
      : ["Tap Start and allow screen capture", "Open the video and tap the floating Start scan button", "Get the answer as a notification in about 30 seconds"];

  return (
    <Screen scroll>
      <TopBar />
      <Txt variant="title">
        Playing on <Txt variant="title" color="accent">this phone?</Txt>
      </Txt>
      <Card padded style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Gradient style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="radio-outline" size={18} color="#fff" />
          </Gradient>
          <Txt variant="strong" style={{ flex: 1 }}>Scan while you watch</Txt>
        </View>
        <View style={{ gap: 8 }}>
          {steps.map((step, i) => (
            <View key={step} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
              <Txt variant="strong" color="accent" style={{ width: 18 }}>{i + 1}</Txt>
              <Txt variant="caption" style={{ flex: 1 }}>{step}</Txt>
            </View>
          ))}
        </View>
        {supported ? (
          <Button title="Start background scan · 1 scan" icon="radio-outline" onPress={start} loading={starting} />
        ) : (
          <Txt variant="caption" color="muted">Background scan isn’t available on this device.</Txt>
        )}
      </Card>
    </Screen>
  );
}
