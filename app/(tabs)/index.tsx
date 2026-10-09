import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/hooks/useProfile";
import { checkFrameQuality, FrameQuality } from "@/lib/frame-quality";
import { prepareImage } from "@/lib/image";
import { useIsOnline } from "@/lib/network";
import { setPendingFrame } from "@/lib/scan-session";
import { registerScanTrigger } from "@/lib/scan-trigger";
import { Image } from "expo-image";
import { BottomSheet, Button, Chip, Gradient, HeroIcon, IconButton, OfflineBanner, Sticker, TextLink, Txt } from "@/ui/components";
import { fonts, useHaptics, useTheme } from "@/ui/theme";

type Mode = "photo" | "camera" | "recording";

type Photo = { uri: string; width: number; height: number };

// A camera scan watches the screen for this long, taking a frame every
// SHOT_EVERY_MS, so the answer can use clues from several moments (a title
// card, a face, a caption) instead of a single shot.
const SCAN_SECONDS = 15;
const SHOT_EVERY_MS = 2500;
// Frames after the main one are sent smaller to keep the upload light.
const EXTRA_FRAME_EDGE = 1024;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Corner({ pos, color }: { pos: "tl" | "tr" | "bl" | "br"; color: string }) {
  const size = 40;
  const w = 4;
  const r = 14;
  const style = {
    position: "absolute" as const,
    width: size,
    height: size,
    borderColor: color,
    ...(pos === "tl" ? { left: 0, top: 0, borderTopWidth: w, borderLeftWidth: w, borderTopLeftRadius: r } : {}),
    ...(pos === "tr" ? { right: 0, top: 0, borderTopWidth: w, borderRightWidth: w, borderTopRightRadius: r } : {}),
    ...(pos === "bl" ? { left: 0, bottom: 0, borderBottomWidth: w, borderLeftWidth: w, borderBottomLeftRadius: r } : {}),
    ...(pos === "br" ? { right: 0, bottom: 0, borderBottomWidth: w, borderRightWidth: w, borderBottomRightRadius: r } : {}),
  };
  return <View style={style} />;
}

export default function ScanScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();
  const online = useIsOnline();
  // Tabs stay mounted, so the camera is only kept on while this tab is visible.
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  const { data: profile } = useProfile();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  // Scanning always uses the back camera, which faces the screen.
  const facing = "back" as const;
  const [torch, setTorch] = useState(false);
  const [busy, setBusy] = useState(false);
  // Seconds left in a running camera scan, or null when not scanning.
  const [scanLeft, setScanLeft] = useState<number | null>(null);
  const [shots, setShots] = useState(0);
  const cancelled = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // A captured frame that looked too dark or blurry, waiting for the user
  // to retake it or scan it anyway (design screen 24).
  const [weak, setWeak] = useState<{ photo: { uri: string; width: number; height: number }; quality: FrameQuality } | null>(null);

  const scansLeft = profile?.scansRemaining ?? 0;
  const granted = !!permission?.granted;
  const blocked = permission ? !permission.granted && !permission.canAskAgain : false;

  // Checks done before every scan, whatever the source.
  const preflight = useCallback((): boolean => {
    setError(null);
    if (!online) {
      haptics.warning();
      setError("You’re offline — connect to scan. Nothing was charged.");
      return false;
    }
    if (scansLeft <= 0) {
      router.push("/paywall");
      return false;
    }
    return true;
  }, [online, scansLeft, router, haptics]);

  const identifyPhoto = useCallback(
    async (photo: { uri: string; width: number; height: number }) => {
      const frame = await prepareImage(photo.uri, photo.width, photo.height);
      setPendingFrame({ ...frame, source: "camera" });
      router.push("/identifying");
    },
    [router],
  );

  const takeShot = useCallback(async (): Promise<Photo | undefined> => {
    // Some Android camera stacks (notably ColorOS) throw a one-off "Aborted";
    // a retry covers genuinely transient failures.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        return await cameraRef.current?.takePictureAsync({ quality: 0.7, shutterSound: false });
      } catch {
        await sleep(300);
      }
    }
    return undefined;
  }, []);

  const capture = useCallback(async () => {
    if (busy || !preflight()) return;
    if (!granted || !cameraRef.current) return;
    setBusy(true);
    cancelled.current = false;
    setShots(0);
    const taken: { photo: Photo; quality: FrameQuality | null }[] = [];
    const started = Date.now();
    const elapsed = () => Date.now() - started;
    setScanLeft(SCAN_SECONDS);
    const ticker = setInterval(() => setScanLeft(Math.max(0, Math.ceil(SCAN_SECONDS - elapsed() / 1000))), 250);
    haptics.press();
    try {
      if (!ready) await sleep(500);
      while (elapsed() < SCAN_SECONDS * 1000 && !cancelled.current) {
        const shotAt = Date.now();
        const photo = await takeShot();
        if (photo) {
          taken.push({ photo, quality: await checkFrameQuality(photo.uri) });
          setShots(taken.length);
        }
        const wait = Math.min(SHOT_EVERY_MS - (Date.now() - shotAt), SCAN_SECONDS * 1000 - elapsed());
        // Sleep in short steps so Cancel responds quickly.
        for (let w = 0; w < wait && !cancelled.current; w += 250) await sleep(Math.min(250, wait - w));
      }
    } finally {
      clearInterval(ticker);
      setScanLeft(null);
    }

    try {
      if (cancelled.current) return;
      if (!taken.length) throw new Error("No frames captured");
      const usable = taken.filter((s) => !s.quality || !(s.quality.dark || s.quality.blurry));
      if (!usable.length) {
        // Every frame was too dark or blurry: show the sharpest so the user
        // can retake with the flash, or scan it anyway.
        const best = [...taken].sort((x, y) => (y.quality?.sharpness ?? 0) - (x.quality?.sharpness ?? 0))[0];
        haptics.warning();
        setWeak({ photo: best.photo, quality: best.quality! });
        return;
      }
      // The sharpest frame leads (it becomes the history thumbnail); the
      // rest add context.
      const [main, ...rest] = [...usable].sort((x, y) => (y.quality?.sharpness ?? 0) - (x.quality?.sharpness ?? 0));
      const frame = await prepareImage(main.photo.uri, main.photo.width, main.photo.height);
      const extras = await Promise.all(rest.map((s) => prepareImage(s.photo.uri, s.photo.width, s.photo.height, EXTRA_FRAME_EDGE)));
      haptics.success();
      setPendingFrame({ ...frame, source: "camera", extraFrames: extras.map((e) => e.base64) });
      router.push("/identifying");
    } catch {
      haptics.error();
      setError("Camera wasn’t ready — try again, or upload a photo instead.");
    } finally {
      setBusy(false);
    }
  }, [busy, preflight, granted, ready, haptics, takeShot, router]);

  const cancelScan = useCallback(() => {
    cancelled.current = true;
    haptics.tap();
  }, [haptics]);

  // Leaving the tab stops a running scan without charging anything.
  useFocusEffect(useCallback(() => () => { cancelled.current = true; }, []));

  const pickPhoto = useCallback(async () => {
    if (busy || !preflight()) return;
    // allowsEditing gives the native crop screen, so people can cut away
    // likes, captions and app buttons before we identify.
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, quality: 1 });
    const asset = picked.canceled ? null : picked.assets?.[0];
    if (!asset?.uri) return;
    setBusy(true);
    try {
      const frame = await prepareImage(asset.uri, asset.width, asset.height);
      setPendingFrame({ ...frame, source: "photo" });
      router.push("/identifying");
    } catch {
      setError("Couldn’t open that photo. Please try another.");
    } finally {
      setBusy(false);
    }
  }, [busy, preflight, router]);

  useFocusEffect(
    useCallback(() => {
      registerScanTrigger(granted ? capture : pickPhoto);
      return () => registerScanTrigger(null);
    }, [granted, capture, pickPhoto]),
  );

  // Shortcuts and the widget open this screen with ?action=photo|camera.
  const { action } = useLocalSearchParams<{ action?: string }>();
  useEffect(() => {
    if (action === "photo") {
      router.setParams({ action: undefined });
      pickPhoto();
    }
  }, [action]); // eslint-disable-line react-hooks/exhaustive-deps

  const onMode = (m: Mode) => {
    haptics.tap();
    if (m === "photo") pickPhoto();
    if (m === "recording") router.push("/scan/recording-guide");
  };

  const scansPill = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${scansLeft} scans left. Get more scans`}
      onPress={() => router.push("/paywall")}
      style={{ height: 40, paddingLeft: 6, paddingRight: 14, borderRadius: 20, backgroundColor: "rgba(13,11,20,0.6)", flexDirection: "row", alignItems: "center", gap: 8 }}
    >
      <Gradient style={{ minWidth: 28, height: 28, paddingHorizontal: 6, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: fonts.body[800], fontSize: 12, color: "#fff" }}>{scansLeft}</Text>
      </Gradient>
      <Text style={{ fontFamily: fonts.body[800], fontSize: 14, color: "#fff" }}>{scansLeft === 1 ? "scan left" : "scans left"}</Text>
    </Pressable>
  );

  const modeSwitcher = (
    <View style={{ flexDirection: "row", justifyContent: "center", gap: 26 }}>
      {([["photo", "PHOTO"], ["camera", "CAMERA"], ["recording", "SCREEN REC"]] as const).map(([m, label]) => {
        const on = m === "camera";
        return (
          <Pressable key={m} accessibilityRole="button" accessibilityLabel={label} onPress={() => onMode(m)} hitSlop={10} style={{ alignItems: "center", gap: 4 }}>
            <Text style={{ fontFamily: fonts.body[800], fontSize: 13, letterSpacing: 0.8, color: on ? "#fff" : "rgba(255,255,255,0.65)" }}>{label}</Text>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: on ? "#FF5CAD" : "transparent" }} />
          </Pressable>
        );
      })}
    </View>
  );

  // Camera not allowed yet: explain before the system prompt (screen 15),
  // or point to Settings once it has been denied for good (screen 16).
  if (!granted) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: fonts.display[800], fontSize: 18, color: t.ink }}>videofy</Text>
          <Chip label={`${scansLeft} scans left`} small onPress={() => router.push("/paywall")} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          {!permission ? (
            <ActivityIndicator color={t.accent} />
          ) : blocked ? (
            <>
              <HeroIcon icon="videocam-off-outline" variant="soft" />
              <Txt variant="title" center>Camera is off</Txt>
              <Txt center>Turn it on in Settings → Apps → Videofy → Permissions.</Txt>
            </>
          ) : (
            <>
              <HeroIcon icon="camera" />
              <Txt variant="title" center>
                Camera, <Txt variant="title" color="accent">please?</Txt>
              </Txt>
              <Txt center>When you tap Scan, Videofy takes a few photos of the screen over 15 seconds. No video, no sound.</Txt>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                <Chip label="Only when you tap" icon="checkmark-circle" small />
                <Chip label="No recording" icon="checkmark-circle" small />
              </View>
            </>
          )}
        </View>
        {!online ? <OfflineBanner /> : null}
        {error ? <Txt color="danger" center>{error}</Txt> : null}
        <View style={{ gap: 6, marginTop: 12 }}>
          {permission && !blocked ? <Button title="Allow camera" onPress={requestPermission} /> : null}
          {blocked ? <Button title="Open Settings" onPress={() => Linking.openSettings()} /> : null}
          <Button title="Upload a photo instead" variant="secondary" onPress={pickPhoto} loading={busy} />
          <TextLink title="Scan a screen recording" onPress={() => router.push("/scan/recording-guide")} />
        </View>
      </View>
    );
  }

  const weakSheet = (
    <BottomSheet visible={!!weak} onClose={() => setWeak(null)}>
      {weak ? (
        <>
          <View style={{ height: 200, borderRadius: 24, overflow: "hidden", backgroundColor: "#000" }}>
            <Image source={{ uri: weak.photo.uri }} style={{ flex: 1 }} contentFit="cover" />
            <Sticker label={weak.quality.dark ? "TOO DARK" : "BLURRY"} style={{ position: "absolute", left: 14, top: 14 }} />
          </View>
          <Txt variant="title" size={24}>
            {weak.quality.dark ? "Hard to see " : "A bit "}
            <Txt variant="title" size={24} color="accent">{weak.quality.dark ? "this one" : "blurry"}</Txt>
          </Txt>
          <Txt>
            {weak.quality.dark
              ? "The frame is very dark, so we may not find a match. Turn on the flash or move closer, then retake."
              : "Hold steady and fill the frame with the screen for a sharper shot."}
          </Txt>
          <Button
            title={weak.quality.dark && !torch && facing === "back" ? "Turn on flash & retake" : "Retake"}
            onPress={() => {
              if (weak.quality.dark && facing === "back") setTorch(true);
              setWeak(null);
            }}
          />
          <Button
            title="Scan anyway · uses 1 scan"
            variant="secondary"
            onPress={async () => {
              const photo = weak.photo;
              setWeak(null);
              setBusy(true);
              try { await identifyPhoto(photo); } finally { setBusy(false); }
            }}
          />
        </>
      ) : null}
    </BottomSheet>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {weakSheet}
      {focused ? (
        <CameraView
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          facing={facing}
          enableTorch={torch}
          onCameraReady={() => setReady(true)}
        />
      ) : null}
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: insets.top + 90, backgroundColor: "rgba(0,0,0,0.25)" }} pointerEvents="none" />

      <View style={{ position: "absolute", left: 18, right: 18, top: insets.top + 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        {scansPill}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <IconButton icon={torch ? "flash" : "flash-outline"} label={torch ? "Turn flash off" : "Turn flash on"} variant={torch ? "lime" : "glass"} onPress={() => setTorch((v) => !v)} />
        </View>
      </View>

      <View pointerEvents="none" style={{ position: "absolute", left: 22, right: 22, top: insets.top + 130, bottom: insets.bottom + 230 }}>
        <Corner pos="tl" color="#FF5CAD" />
        <Corner pos="tr" color="#FF5CAD" />
        <Corner pos="bl" color="#F0600A" />
        <Corner pos="br" color="#F0600A" />
        {busy && scanLeft === null ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color="#fff" size="large" />
          </View>
        ) : null}
      </View>

      {scanLeft !== null ? (
        <View style={{ position: "absolute", left: 22, right: 22, top: insets.top + 130, bottom: insets.bottom + 230, alignItems: "center", justifyContent: "center", gap: 10 }}>
          <View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: "rgba(13,11,20,0.55)", alignItems: "center", justifyContent: "center" }}>
            <Text accessibilityLiveRegion="polite" style={{ fontFamily: fonts.display[800], fontSize: 54, color: "#fff" }}>{scanLeft}</Text>
          </View>
          <View style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(13,11,20,0.6)", alignItems: "center" }}>
            <Text style={{ fontFamily: fonts.body[800], fontSize: 15, color: "#fff" }}>Hold steady on the screen</Text>
            <Text style={{ fontFamily: fonts.body[600], fontSize: 12, color: "rgba(255,255,255,0.75)" }}>{shots} {shots === 1 ? "frame" : "frames"} captured</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancel scan" onPress={cancelScan} hitSlop={10} style={{ marginTop: 6, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.9)" }}>
            <Text style={{ fontFamily: fonts.body[800], fontSize: 14, color: "#0D0B14" }}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ position: "absolute", left: 20, right: 20, bottom: insets.bottom + 110, gap: 14 }}>
        {!online ? <OfflineBanner /> : null}
        {error ? (
          <Pressable onPress={() => setError(null)} style={{ flexDirection: "row", gap: 10, alignItems: "center", padding: 12, borderRadius: 16, backgroundColor: "rgba(13,11,20,0.82)" }}>
            <Ionicons name="alert-circle" size={18} color="#FF6B6B" />
            <Text style={{ flex: 1, color: "#fff", fontFamily: fonts.body[600], fontSize: 13 }}>{error}</Text>
          </Pressable>
        ) : (
          <View style={{ alignSelf: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: "rgba(13,11,20,0.6)" }}>
            <Text style={{ fontFamily: fonts.body[700], fontSize: 14, color: "#fff" }}>Point at the screen and tap Scan · 15 sec</Text>
          </View>
        )}
        {modeSwitcher}
      </View>
    </View>
  );
}
