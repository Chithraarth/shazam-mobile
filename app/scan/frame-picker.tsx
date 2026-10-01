import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as VideoThumbnails from "expo-video-thumbnails";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useProfile } from "@/hooks/useProfile";
import { prepareImage } from "@/lib/image";
import { setPendingFrame } from "@/lib/scan-session";
import { Button, Screen, TopBar, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

const FRAME_COUNT = 6;

type Frame = { time: number; uri: string; width: number; height: number };

const fmt = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

export default function FramePicker() {
  const t = useTheme();
  const router = useRouter();
  const { uri, duration } = useLocalSearchParams<{ uri: string; duration?: string }>();
  const { data: profile } = useProfile();
  const [frames, setFrames] = useState<Frame[]>([]);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const totalMs = Number(duration) || 0;

  useEffect(() => {
    if (!uri) return;
    let cancelled = false;
    (async () => {
      const span = totalMs > 0 ? totalMs : 10000;
      // Evenly spaced frames, skipping the very first and last moments.
      const times = Array.from({ length: FRAME_COUNT }, (_, i) => Math.floor((span * (i + 1)) / (FRAME_COUNT + 1)));
      const out: Frame[] = [];
      for (const time of times) {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(uri, { time, quality: 0.8 });
          out.push({ time, ...thumb });
        } catch {
          /* skip frames that fail to decode */
        }
        if (cancelled) return;
      }
      if (!cancelled) {
        setFrames(out);
        setSelected(Math.floor(out.length / 2));
        setLoading(false);
        if (!out.length) setError("Couldn’t read that recording. Please try another clip.");
      }
    })();
    return () => { cancelled = true; };
  }, [uri, totalMs]);

  const use = async () => {
    const frame = frames[selected];
    if (!frame) return;
    if ((profile?.scansRemaining ?? 0) <= 0) {
      router.push("/paywall");
      return;
    }
    setBusy(true);
    try {
      const prepared = await prepareImage(frame.uri, frame.width, frame.height);
      setPendingFrame({ ...prepared, source: "recording" });
      router.replace("/identifying");
    } catch {
      setError("Couldn’t use that frame. Try another one.");
      setBusy(false);
    }
  };

  const current = frames[selected];

  return (
    <Screen>
      <TopBar title="Pick the moment" />
      <View style={{ height: 420, borderRadius: 28, overflow: "hidden", backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
        {loading ? <ActivityIndicator color={t.accent} /> : current ? <Image source={{ uri: current.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" /> : null}
      </View>
      <View style={{ flexDirection: "row", gap: 4, height: 64 }}>
        {frames.map((f, i) => (
          <Pressable
            key={f.time}
            accessibilityRole="button"
            accessibilityLabel={`Frame at ${fmt(f.time)}`}
            accessibilityState={{ selected: i === selected }}
            onPress={() => setSelected(i)}
            style={{ flex: 1, borderRadius: 10, overflow: "hidden", borderWidth: 3, borderColor: i === selected ? t.pink : "transparent" }}
          >
            <Image source={{ uri: f.uri }} style={{ flex: 1 }} contentFit="cover" />
          </Pressable>
        ))}
      </View>
      {current ? (
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
          <Text style={{ fontFamily: fonts.body[800], fontSize: 13, color: t.accent }}>{fmt(current.time)}</Text>
          <Text style={{ fontFamily: fonts.body[800], fontSize: 13, color: t.muted }}>{totalMs ? fmt(totalMs) : ""}</Text>
        </View>
      ) : null}
      <Txt variant="caption" center>Pick a moment with faces or subtitles.</Txt>
      {error ? <Txt color="danger" center>{error}</Txt> : null}
      <View style={{ flex: 1 }} />
      <Button title="Use this frame" onPress={use} loading={busy} disabled={!current} />
    </Screen>
  );
}
