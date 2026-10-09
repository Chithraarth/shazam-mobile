import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, View } from "react-native";
import { ApiError, useIdentify } from "@/lib/api";
import { useHistory } from "@/lib/history-store";
import { clearPendingFrame, getPendingFrame } from "@/lib/scan-session";
import { Button, Card, Chip, Gradient, HeroIcon, ProgressBar, Screen, Txt } from "@/ui/components";
import { useHaptics, useTheme } from "@/ui/theme";

const STAGES = ["Reading the frame", "Looking for faces & text", "Checking the catalog"];

export default function Identifying() {
  const t = useTheme();
  const router = useRouter();
  const haptics = useHaptics();
  const queryClient = useQueryClient();
  const identify = useIdentify();
  const history = useHistory();
  const frame = useRef(getPendingFrame()).current;
  const [stage, setStage] = useState(0);
  const [progress, setProgress] = useState(0.08);
  const [failure, setFailure] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(scanLine, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [scanLine]);

  const run = useCallback(async () => {
    if (!frame) return;
    setFailure(null);
    setStage(0);
    setProgress(0.08);
    // The stages are paced to the typical response time; the last one waits
    // for the real answer.
    const timers = [
      setTimeout(() => { setStage(1); setProgress(0.4); }, 1200),
      setTimeout(() => { setStage(2); setProgress(0.7); }, 2600),
    ];
    try {
      const result = await identify(frame.base64, frame.extraFrames);
      timers.forEach(clearTimeout);
      setProgress(1);
      const item = await history.add(result, frame.base64);
      clearPendingFrame();
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      if (result.found) haptics.success(); else haptics.warning();
      router.replace({ pathname: "/result", params: { id: item.id, fresh: "1" } });
    } catch (err) {
      timers.forEach(clearTimeout);
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      const e = err instanceof ApiError ? err : new ApiError("failed", "Something went wrong. Your scan wasn’t used.");
      if (e.code === "out_of_scans") {
        router.replace("/paywall");
        return;
      }
      haptics.error();
      setFailure(e);
    }
  }, [frame, identify, history, queryClient, router, haptics]);

  useEffect(() => {
    if (!frame) {
      router.replace("/");
      return;
    }
    run();
    // attempt re-runs the scan when the user taps Try again.
  }, [attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!frame) return null;

  if (failure) {
    const offline = failure.code === "offline";
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
          <HeroIcon icon={offline ? "cloud-offline-outline" : "refresh"} variant="soft" />
          <Txt variant="title" center>
            {offline ? "You’re " : "That didn’t "}
            <Txt variant="title" color="accent">{offline ? "offline" : "work"}</Txt>
          </Txt>
          <Txt center>{failure.message}</Txt>
          <Card padded style={{ flexDirection: "row", gap: 12, alignItems: "center", alignSelf: "stretch" }}>
            <Chip label="Not charged" tone="ok" small icon="checkmark" />
            <Txt variant="caption" style={{ flex: 1 }}>Your photo is kept here until you try again.</Txt>
          </Card>
        </View>
        <Button title="Try again" onPress={() => setAttempt((a) => a + 1)} />
        <Button title="Back to scanning" variant="secondary" onPress={() => { clearPendingFrame(); router.replace("/"); }} />
      </Screen>
    );
  }

  const translateY = scanLine.interpolate({ inputRange: [0, 1], outputRange: [0, 320] });

  return (
    <Screen>
      <Gradient style={{ height: 340, borderRadius: 30, padding: 4 }}>
        <View style={{ flex: 1, borderRadius: 26, overflow: "hidden", backgroundColor: "#000" }}>
          <Image source={{ uri: frame.uri }} style={{ flex: 1 }} contentFit="cover" />
          <Animated.View style={{ position: "absolute", left: 0, right: 0, top: 0, height: 3, backgroundColor: "rgba(255,255,255,0.9)", transform: [{ translateY }] }} />
        </View>
      </Gradient>
      <Txt variant="title" size={32}>
        Finding it<Txt variant="title" size={32} color="accent">…</Txt>
      </Txt>
      <ProgressBar value={progress} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {STAGES.map((label, i) =>
          i < stage ? (
            <Chip key={label} label={label} tone="ok" icon="checkmark" />
          ) : i === stage ? (
            <Chip key={label} label={`${label}…`} tone="outline" />
          ) : null,
        )}
      </View>
      <View style={{ flex: 1 }} />
      <Card padded style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.lime, alignItems: "center", justifyContent: "center" }}>
          <Txt variant="strong" color="onLime" size={13}>✓</Txt>
        </View>
        <Txt variant="strong" style={{ flex: 1 }}>If anything fails on our side, your scan is given back.</Txt>
      </Card>
    </Screen>
  );
}
