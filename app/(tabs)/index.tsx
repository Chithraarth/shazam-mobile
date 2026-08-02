import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as VideoThumbnails from "expo-video-thumbnails";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useUser } from "@clerk/expo";
import { useAuthedFetch } from "@/hooks/useProfile";
import { historyKeyFor, LocalHistoryItem } from "./history";

const MAX_IMAGE_BYTES = 7 * 1024 * 1024;
const FRAME_SIZE = 260;
const CORNER_SIZE = 28;
const CORNER_THICKNESS = 3;

function getBase64Size(b64: string) {
  return Math.floor(b64.length * 0.75);
}
function compressIfNeeded(base64: string): string {
  if (getBase64Size(base64) <= MAX_IMAGE_BYTES) return base64;
  return base64.substring(0, Math.floor(MAX_IMAGE_BYTES / 0.75));
}
async function saveToHistory(item: LocalHistoryItem, userId: string | null | undefined) {
  try {
    const key = historyKeyFor(userId);
    const raw = await AsyncStorage.getItem(key);
    const data: LocalHistoryItem[] = raw ? JSON.parse(raw) : [];
    data.unshift(item);
    if (data.length > 100) data.splice(100);
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

let CameraView: any = null;
let useCameraPermissions: any = null;
if (Platform.OS !== "web") {
  try {
    const cam = require("expo-camera");
    CameraView = cam.CameraView;
    useCameraPermissions = cam.useCameraPermissions;
  } catch {}
}
function useCameraPerms() {
  if (useCameraPermissions) return useCameraPermissions();
  return [
    { granted: false, status: "denied", canAskAgain: false },
    async () => ({ granted: false }),
  ];
}

function ViewfinderCorners({ scanning }: { scanning: boolean }) {
  const colors = useColors();
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (scanning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.04, duration: 600, useNativeDriver: true }),
          Animated.timing(scaleAnim, { toValue: 0.98, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      Animated.timing(glowAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      Animated.timing(scaleAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
    return () => {
      glowAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [scanning]);

  const cornerColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(136,77,255,0.4)", "rgba(136,77,255,1)"],
  });

  const corners = [
    { top: 0, left: 0, borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
    { top: 0, right: 0, borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
    { bottom: 0, left: 0, borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS },
    { bottom: 0, right: 0, borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS },
  ];

  return (
    <Animated.View
      style={[
        styles.viewfinderFrame,
        { transform: [{ scale: scaleAnim }] },
      ]}
    >
      {corners.map((corner, i) => (
        <Animated.View
          key={i}
          style={[
            styles.corner,
            corner,
            {
              borderColor: cornerColor,
              width: CORNER_SIZE,
              height: CORNER_SIZE,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

function ScanLine({ scanning }: { scanning: boolean }) {
  const scanY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (scanning) {
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanY, {
            toValue: FRAME_SIZE - 2,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scanY, {
            toValue: 0,
            duration: 1800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start();
      scanY.setValue(0);
    }
    return () => {
      scanY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [scanning]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.scanLineContainer,
        { opacity, transform: [{ translateY: scanY }] },
      ]}
    >
      <LinearGradient
        colors={["transparent", "rgba(136,77,255,0.9)", "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.scanLine}
      />
      <View style={styles.scanLineGlow} />
    </Animated.View>
  );
}

function ScanButton({
  onPress,
  scanning,
  disabled,
}: {
  onPress: () => void;
  scanning: boolean;
  disabled: boolean;
}) {
  const ripple1 = useRef(new Animated.Value(0)).current;
  const ripple2 = useRef(new Animated.Value(0)).current;
  const ripple3 = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    ripple1.stopAnimation();
    ripple2.stopAnimation();
    ripple3.stopAnimation();
    pulse.stopAnimation();
    spin.stopAnimation();

    if (scanning) {
      pulse.setValue(1);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 600, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 2000, easing: Easing.linear, useNativeDriver: true })
      ).start();
    } else {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(ripple1, { toValue: 1, duration: 2200, useNativeDriver: true }),
            Animated.timing(ripple1, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(700),
            Animated.timing(ripple2, { toValue: 1, duration: 2200, useNativeDriver: true }),
            Animated.timing(ripple2, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.delay(1400),
            Animated.timing(ripple3, { toValue: 1, duration: 2200, useNativeDriver: true }),
            Animated.timing(ripple3, { toValue: 0, duration: 0, useNativeDriver: true }),
          ]),
        ])
      ).start();
    }

    return () => {
      ripple1.stopAnimation();
      ripple2.stopAnimation();
      ripple3.stopAnimation();
      pulse.stopAnimation();
      spin.stopAnimation();
    };
  }, [scanning]);

  const rippleStyle = (anim: Animated.Value) => ({
    position: "absolute" as const,
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: "rgba(136,77,255,0.8)",
    opacity: anim.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 0.6, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 2.6] }) }],
  });

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.scanBtnWrapper}>
      {!scanning && (
        <>
          <Animated.View style={rippleStyle(ripple1)} />
          <Animated.View style={rippleStyle(ripple2)} />
          <Animated.View style={rippleStyle(ripple3)} />
        </>
      )}
      {scanning && (
        <Animated.View
          style={[
            styles.spinRing,
            { transform: [{ rotate }] },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <Pressable
          onPress={onPress}
          disabled={disabled || scanning}
          testID="scan-button"
          style={({ pressed }) => [
            { opacity: disabled && !scanning ? 0.5 : pressed ? 0.85 : 1 },
          ]}
        >
          <LinearGradient
            colors={["#884dff", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.scanBtnGradient}
          >
            {scanning ? (
              <ActivityIndicator color="#fff" size="large" />
            ) : (
              <Ionicons name="scan-outline" size={36} color="#fff" />
            )}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
}

type ScanState = "idle" | "scanning" | "error";

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authedFetch = useAuthedFetch();
  const { user } = useUser();
  const cameraRef = useRef<any>(null);

  const [scanState, setScanState] = useState<ScanState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraFacing, setCameraFacing] = useState<"back" | "front">("back");
  const [permission, requestPermission] = useCameraPerms();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const canUseCamera = Platform.OS !== "web" && CameraView !== null && permission?.granted;
  const cameraPermissionNeeded =
    Platform.OS !== "web" && CameraView !== null && permission !== null && !permission?.granted;

  async function callIdentify(imageData: string, mimeType: string) {
    const res = await authedFetch("/api/identify", {
      method: "POST",
      body: JSON.stringify({
        imageData,
        mimeType,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 || res.status === 403) throw new Error("ACCESS_DENIED");
      throw new Error((data as any).error ?? `Server error ${res.status}`);
    }
    return res.json();
  }

  async function runScan(imageData: string, mimeType: string) {
    const result = await callIdentify(imageData, mimeType);
    await saveToHistory({
      id: Date.now().toString() + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      found: result.found,
      confidence: result.confidence,
      title: result.title ?? null,
      type: result.type ?? null,
      platform: result.platform ?? null,
      resultData: JSON.stringify(result),
    }, user?.id);
    await Haptics.notificationAsync(
      result.found
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Warning
    );
    setScanState("idle");
    router.push({ pathname: "/result", params: { resultData: JSON.stringify(result) } });
  }

  async function handleScan() {
    if (scanState === "scanning") return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanState("scanning");
    setErrorMsg(null);
    try {
      let imageData: string;
      let mimeType = "image/jpeg";
      if (canUseCamera && cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true, quality: 0.75, skipProcessing: true,
        });
        if (!photo?.base64) throw new Error("Camera capture failed");
        imageData = compressIfNeeded(photo.base64);
      } else {
        const picked = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"], quality: 0.75, base64: true, allowsEditing: false,
        });
        if (picked.canceled || !picked.assets?.[0]?.base64) { setScanState("idle"); return; }
        imageData = compressIfNeeded(picked.assets[0].base64!);
        mimeType = picked.assets[0].mimeType ?? "image/jpeg";
      }
      await runScan(imageData, mimeType);
    } catch (err: any) {
      setScanState("error");
      setErrorMsg(
        err.message === "ACCESS_DENIED"
          ? "Full access required — get lifetime access from the Account tab"
          : err.message ?? "Scan failed. Please try again."
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleUpload() {
    if (scanState === "scanning") return;
    await Haptics.selectionAsync();
    setScanState("scanning");
    setErrorMsg(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"], quality: 0.75, base64: true, allowsEditing: false,
      });
      if (picked.canceled || !picked.assets?.[0]?.base64) { setScanState("idle"); return; }
      const mimeType = picked.assets[0].mimeType ?? "image/jpeg";
      await runScan(compressIfNeeded(picked.assets[0].base64!), mimeType);
    } catch (err: any) {
      setScanState("error");
      setErrorMsg(
        err.message === "ACCESS_DENIED"
          ? "Full access required — get lifetime access from the Account tab"
          : err.message ?? "Upload failed. Please try again."
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function runScreenScan() {
    setScanState("scanning");
    setErrorMsg(null);
    try {
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["videos"],
        allowsEditing: false,
      });
      if (picked.canceled || !picked.assets?.[0]?.uri) {
        setScanState("idle");
        return;
      }
      const asset = picked.assets[0];
      const durationMs = asset.duration ?? 0;
      const timeMs = durationMs > 0 ? Math.floor(durationMs / 2) : 1000;
      // Extract a single frame for identification — no playback, no extra in-app copy kept
      let thumb;
      try {
        thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: timeMs,
          quality: 0.75,
        });
      } catch {
        thumb = await VideoThumbnails.getThumbnailAsync(asset.uri, {
          time: 1000,
          quality: 0.75,
        });
      }
      const base64 = await FileSystem.readAsStringAsync(thumb.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.deleteAsync(thumb.uri, { idempotent: true }).catch(() => {});
      await runScan(compressIfNeeded(base64), "image/jpeg");
    } catch (err: any) {
      setScanState("error");
      setErrorMsg(
        err.message === "ACCESS_DENIED"
          ? "Full access required — get lifetime access from the Account tab"
          : "Couldn't read that recording. Please try another clip."
      );
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  async function handleScreenScan() {
    if (scanState === "scanning") return;
    await Haptics.selectionAsync();
    Alert.alert(
      "Scan Your Screen",
      "Record your screen using your phone's built-in Screen Recording (Control Center on iPhone, Quick Settings on Android) while the video plays, then pick that recording here.\n\nPrivacy: we extract just one frame to identify the video. The app never plays the recording back or keeps a copy of it.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Choose Recording", onPress: () => { runScreenScan(); } },
      ]
    );
  }

  const isScanning = scanState === "scanning";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {canUseCamera ? (
        <>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={cameraFacing}
          />
          <LinearGradient
            colors={[colors.background, "transparent"]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0.55 }}
            style={styles.cameraBottomFade}
            pointerEvents="none"
          />
          <LinearGradient
            colors={[colors.background, "transparent"]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 0.2 }}
            style={styles.cameraTopFade}
            pointerEvents="none"
          />
        </>
      ) : (
        <LinearGradient
          colors={["rgba(136,77,255,0.15)", colors.background]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.55 }}
          style={StyleSheet.absoluteFill}
        />
      )}

      {cameraPermissionNeeded && (
        <View style={styles.permArea}>
          {permission?.canAskAgain ? (
            <Pressable onPress={requestPermission} style={styles.permBtn}>
              <LinearGradient colors={["#884dff", "#7c3aed"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.permBtnGrad}>
                <Text style={styles.permBtnText}>Allow Camera</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => Alert.alert("Camera Permission", "Please enable camera access in Settings.")}
              style={[styles.permBtnOutline, { borderColor: colors.primary }]}
            >
              <Text style={[styles.permBtnText, { color: colors.primary }]}>Open Settings</Text>
            </Pressable>
          )}
        </View>
      )}

      <View style={styles.viewfinderArea} pointerEvents="none">
        <ViewfinderCorners scanning={isScanning} />
        <ScanLine scanning={isScanning} />
      </View>

      <View style={[styles.topBar, { paddingTop: topPad + 12, paddingHorizontal: 16 }]}>
        {canUseCamera ? (
          <Pressable
            onPress={() => setCameraFacing((f) => (f === "back" ? "front" : "back"))}
            style={[styles.topIconBtn, { backgroundColor: "rgba(0,0,0,0.5)" }]}
          >
            <Ionicons name="camera-reverse-outline" size={20} color="#fff" />
          </Pressable>
        ) : (
          <View style={styles.topIconBtn} />
        )}

        <Pressable
          onPress={handleUpload}
          disabled={isScanning}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.logoText}>Videofy</Text>
        </Pressable>

        <View style={styles.topIconBtn} />
      </View>

      <View style={[styles.bottomArea, { paddingBottom: bottomPad + 90 }]}>
        {scanState === "error" && errorMsg && (
          <Pressable
            onPress={() => { setScanState("idle"); setErrorMsg(null); }}
            style={styles.errorPill}
          >
            <Ionicons name="alert-circle" size={16} color="#f87171" />
            <Text style={styles.errorPillText} numberOfLines={2}>{errorMsg}</Text>
          </Pressable>
        )}

        {isScanning && (
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Identifying…</Text>
          </View>
        )}

        <ScanButton
          onPress={handleScan}
          scanning={isScanning}
          disabled={scanState !== "idle" && scanState !== "error"}
        />

        <Text style={[styles.tapHint, { color: "rgba(255,255,255,0.4)" }]}>
          {isScanning ? "Processing your image" : "Tap to identify"}
        </Text>

        <Pressable
          onPress={handleScreenScan}
          disabled={isScanning}
          style={({ pressed }) => [
            styles.screenScanBtn,
            { opacity: isScanning ? 0.4 : pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="phone-portrait-outline" size={16} color="#b794ff" />
          <Text style={styles.screenScanText}>Scan a screen recording</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  cameraBottomFade: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 300,
  },
  cameraTopFade: {
    position: "absolute", top: 0, left: 0, right: 0, height: 140,
  },
  noCameraArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
    paddingBottom: 140,
  },
  noCameraCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  noCameraText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
  permBtn: { borderRadius: 12, overflow: "hidden", marginTop: 4 },
  permBtnGrad: { paddingHorizontal: 28, paddingVertical: 13 },
  permBtnOutline: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 4,
  },
  permBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  viewfinderArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  viewfinderFrame: {
    width: FRAME_SIZE,
    height: FRAME_SIZE,
    position: "relative",
  },
  corner: {
    position: "absolute",
    borderColor: "rgba(136,77,255,0.8)",
    borderRadius: 3,
  },
  scanLineContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    width: FRAME_SIZE,
    height: 4,
    overflow: "visible",
  },
  scanLine: {
    height: 2,
    width: "100%",
    borderRadius: 1,
  },
  scanLineGlow: {
    position: "absolute",
    top: -6,
    left: "10%",
    right: "10%",
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(136,77,255,0.15)",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  logoText: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: 0.3 },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  permArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 140,
  },
  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    gap: 14,
    paddingTop: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#884dff",
  },
  statusText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
  errorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.8)",
    marginHorizontal: 24,
  },
  errorPillText: { color: "#f87171", fontSize: 13, flex: 1 },
  scanBtnWrapper: {
    width: 110,
    height: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  spinRing: {
    position: "absolute",
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 2,
    borderColor: "transparent",
    borderTopColor: "#884dff",
    borderRightColor: "rgba(136,77,255,0.4)",
  },
  scanBtnGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#884dff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
  },
  tapHint: {
    fontSize: 13,
    letterSpacing: 0.3,
  },
  screenScanBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(136,77,255,0.45)",
    backgroundColor: "rgba(136,77,255,0.12)",
  },
  screenScanText: {
    color: "#b794ff",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
