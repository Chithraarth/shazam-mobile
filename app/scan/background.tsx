import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, Platform, Text, View } from "react-native";
import { isBackgroundScanSupported, startBackgroundScan } from "videofy-broadcast";
import { useProfile } from "@/hooks/useProfile";
import { Button, Card, Gradient, HeroIcon, Screen, TopBar, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

const STEPS = {
  android: [
    { title: "Tap Start below", body: "Allow screen capture for Videofy" },
    { title: "Open your video", body: "Instagram, YouTube, Netflix — anywhere" },
    { title: "Get the answer", body: "In about 30 seconds, as a notification" },
  ],
  ios: [
    { title: "Tap Start below", body: "Choose Videofy, then Start Broadcast" },
    { title: "Open your video", body: "Instagram, YouTube, Netflix — anywhere" },
    { title: "Get the answer", body: "In about 30 seconds, as a notification" },
  ],
};

// Background scan: Videofy watches the screen for 15 seconds while another
// app plays the video, then sends the answer as a notification.
export default function BackgroundScan() {
  const t = useTheme();
  const router = useRouter();
  const { data: profile } = useProfile();
  const [starting, setStarting] = useState(false);
  const supported = isBackgroundScanSupported();
  const steps = STEPS[Platform.OS === "ios" ? "ios" : "android"];

  const start = async () => {
    if ((profile?.scansRemaining ?? 0) <= 0) {
      router.push("/paywall");
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
      <HeroIcon icon="radio-outline" />
      <Txt variant="title">
        Scan in the <Txt variant="title" color="accent">background</Txt>
      </Txt>
      <Txt>Playing something on this phone? Start a background scan, open the video, and Videofy tells you what it is.</Txt>
      <View style={{ gap: 12 }}>
        {steps.map((s, i) => (
          <Card key={s.title} padded style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
            <Gradient style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: fonts.display[700], fontSize: 15, color: "#fff" }}>{i + 1}</Text>
            </Gradient>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="strong">{s.title}</Txt>
              <Txt variant="caption">{s.body}</Txt>
            </View>
          </Card>
        ))}
      </View>
      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
        <Ionicons name="lock-closed-outline" size={16} color={t.muted} />
        <Txt variant="caption" style={{ flex: 1 }}>
          Videofy only looks at the screen for 15 seconds after you leave the app. No video or sound is saved.
        </Txt>
      </View>
      <View style={{ flex: 1 }} />
      {supported ? (
        <Button title="Start background scan · 1 scan" icon="radio-outline" onPress={start} loading={starting} />
      ) : (
        <Txt center color="muted">Background scan isn’t available on this device.</Txt>
      )}
    </Screen>
  );
}
