import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Platform, Text, View } from "react-native";
import { Button, Card, Gradient, Screen, Segmented, TopBar, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

const STEPS = {
  android: [
    { title: "Start screen record", body: "Swipe down twice → Screen record" },
    { title: "Play 5–10 seconds", body: "Scenes with faces or subtitles work best" },
    { title: "Come back & pick it", body: "Then choose the best frame" },
  ],
  ios: [
    { title: "Start screen recording", body: "Control Center → Screen Recording" },
    { title: "Play 5–10 seconds", body: "Scenes with faces or subtitles work best" },
    { title: "Come back & pick it", body: "Then choose the best frame" },
  ],
};

export default function RecordingGuide() {
  const t = useTheme();
  const router = useRouter();
  const [os, setOs] = useState<"android" | "ios">(Platform.OS === "ios" ? "ios" : "android");
  const [busy, setBusy] = useState(false);

  const choose = async () => {
    setBusy(true);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["videos"], allowsEditing: false });
      const asset = picked.canceled ? null : picked.assets?.[0];
      if (asset?.uri) {
        router.replace({ pathname: "/scan/frame-picker", params: { uri: asset.uri, duration: String(asset.duration ?? 0) } });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <Txt variant="title">
        Playing on <Txt variant="title" color="accent">this phone?</Txt>
      </Txt>
      <Segmented value={os} onChange={setOs} options={[{ value: "android", label: "Android" }, { value: "ios", label: "iPhone" }]} />
      <View style={{ gap: 12 }}>
        {STEPS[os].map((s, i) => (
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
        <Txt variant="caption" style={{ flex: 1 }}>We use one frame. The recording itself is never uploaded.</Txt>
      </View>
      <View style={{ flex: 1 }} />
      <Button title="Choose recording" onPress={choose} loading={busy} />
    </Screen>
  );
}
