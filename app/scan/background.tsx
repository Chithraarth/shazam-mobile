import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, View } from "react-native";
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

  const start = async () => {
    if ((profile?.scansRemaining ?? 0) <= 0) {
      router.push("/paywall");
      return;
    }
    if (Platform.OS === "android" && !hasBackgroundScanOverlayPermission()) {
      Alert.alert(
        "One more permission",
        "Videofy needs to display the Start button over other apps. You'll be taken to a settings screen — turn on \"Allow display over other apps\" for Videofy, then come back and try again.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Continue", onPress: requestBackgroundScanOverlayPermission },
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
        <Txt variant="caption">
          {Platform.OS === "ios"
            ? "Tap Start, choose Videofy and Start Broadcast, then open the video. Videofy watches for 15 seconds and sends you the answer as a notification."
            : "Tap Start and allow screen capture, then open the video. A floating Start button appears over the app — tap it once the video is playing, and Videofy watches for 15 seconds before sending you the answer as a notification."}
        </Txt>
        {supported ? (
          <Button title="Start background scan · 1 scan" icon="radio-outline" onPress={start} loading={starting} />
        ) : (
          <Txt variant="caption" color="muted">Background scan isn’t available on this device.</Txt>
        )}
      </Card>
    </Screen>
  );
}
