import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ConfidenceRing from "@/components/ConfidenceRing";
import { useColors } from "@/hooks/useColors";

interface CastMember {
  name: string;
  role?: string | null;
  character?: string | null;
}

interface EpisodeInfo {
  season?: number | null;
  episode?: number | null;
  episodeTitle?: string | null;
}

interface IdentifyResult {
  found: boolean;
  confidence: number;
  title?: string | null;
  type?: string | null;
  year?: number | null;
  platform?: string | null;
  genre?: string | null;
  language?: string | null;
  episode?: EpisodeInfo | null;
  cast?: CastMember[];
  director?: string | null;
  choreographer?: string | null;
  producer?: string | null;
  musicDirector?: string | null;
  country?: string | null;
  creator?: string | null;
  creatorHandle?: string | null;
  synopsis?: string | null;
  alternativeTitles?: string[];
  identificationClues?: string | null;
}

function getPlatformBadgeStyle(platform: string): { bg: string; text: string } {
  const p = platform.toLowerCase();
  if (p.includes("netflix")) return { bg: "#dc2626", text: "#fff" };
  if (p.includes("hbo") || p.includes("max")) return { bg: "#7e22ce", text: "#fff" };
  if (p.includes("disney")) return { bg: "#1d4ed8", text: "#fff" };
  if (p.includes("apple")) return { bg: "#374151", text: "#fff" };
  if (p.includes("amazon") || p.includes("prime")) return { bg: "#0369a1", text: "#fff" };
  if (p.includes("hulu")) return { bg: "#15803d", text: "#fff" };
  if (p.includes("paramount")) return { bg: "#1e40af", text: "#fff" };
  if (p.includes("peacock")) return { bg: "#7c3aed", text: "#fff" };
  if (p.includes("instagram")) return { bg: "#c2255c", text: "#fff" };
  if (p.includes("facebook")) return { bg: "#1877f2", text: "#fff" };
  if (p.includes("tiktok")) return { bg: "#111", text: "#fff" };
  if (p.includes("youtube")) return { bg: "#dc2626", text: "#fff" };
  return { bg: "rgba(136,77,255,0.2)", text: "#884dff" };
}

function getRecognitionStage(confidence: number): {
  label: string;
  bg: string;
  text: string;
  border: string;
} {
  if (confidence >= 80)
    return { label: "Highly Recognized", bg: "rgba(34,197,94,0.15)", text: "#4ade80", border: "rgba(34,197,94,0.4)" };
  if (confidence >= 50)
    return { label: "Moderately Recognized", bg: "rgba(234,179,8,0.15)", text: "#facc15", border: "rgba(234,179,8,0.4)" };
  return { label: "Low Recognition", bg: "rgba(239,68,68,0.15)", text: "#f87171", border: "rgba(239,68,68,0.4)" };
}

function RecognitionStageBadge({ confidence }: { confidence: number }) {
  const stage = getRecognitionStage(confidence);
  return (
    <View
      style={[
        styles.stageBadge,
        { backgroundColor: stage.bg, borderColor: stage.border },
      ]}
    >
      <Text style={[styles.stageBadgeText, { color: stage.text }]}>{stage.label}</Text>
    </View>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const badge = getPlatformBadgeStyle(platform);
  return (
    <View style={[styles.platformBadge, { backgroundColor: badge.bg }]}>
      <Text style={[styles.platformBadgeText, { color: badge.text }]}>{platform}</Text>
    </View>
  );
}

function SectionLabel({ text }: { text: string }) {
  const colors = useColors();
  return (
    <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>{text}</Text>
  );
}

export default function ResultScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { resultData } = useLocalSearchParams<{ resultData: string }>();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  let result: IdentifyResult | null = null;
  try {
    result = resultData ? JSON.parse(resultData) : null;
  } catch {
    result = null;
  }

  if (!result) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <View style={[styles.topBar, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={26} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.foreground }]}>Result unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => { Haptics.selectionAsync(); router.back(); }}
          hitSlop={12}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
          <Text style={[styles.backLabel, { color: colors.foreground }]}>Back</Text>
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Result</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 40 }]}
      >
        <View style={styles.heroSection}>
          <LinearGradient
            colors={["rgba(136,77,255,0.3)", "rgba(136,77,255,0.05)", colors.background]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.ringColumn}>
            <ConfidenceRing confidence={result.confidence} size={140} />
            <RecognitionStageBadge confidence={result.confidence} />
          </View>
          <View style={styles.heroInfo}>
            {result.found ? (
              <>
                <Text style={[styles.heroTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {result.title ?? "Unknown"}
                </Text>
                <View style={styles.metaRow}>
                  {result.year && (
                    <Text style={[styles.metaChip, { color: colors.mutedForeground }]}>
                      {result.year}
                    </Text>
                  )}
                  {result.type && (
                    <Text style={[styles.metaChip, { color: colors.mutedForeground }]}>
                      {result.type.replace("_", " ")}
                    </Text>
                  )}
                  {result.genre && (
                    <Text style={[styles.metaChip, { color: colors.mutedForeground }]}>
                      {result.genre}
                    </Text>
                  )}
                </View>
                {result.platform && <PlatformBadge platform={result.platform} />}
              </>
            ) : (
              <>
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>Not Identified</Text>
                <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
                  Try a clearer or brighter image
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.cards}>
          {result.episode && (result.episode.season || result.episode.episode) && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: "rgba(136,77,255,0.05)",
                  borderColor: "rgba(136,77,255,0.2)",
                },
              ]}
            >
              <SectionLabel text="EPISODE" />
              <Text style={[styles.cardValue, { color: colors.foreground }]}>
                {[
                  result.episode.season != null ? `S${result.episode.season}` : null,
                  result.episode.episode != null ? `E${result.episode.episode}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                {result.episode.episodeTitle ? ` — ${result.episode.episodeTitle}` : ""}
              </Text>
            </View>
          )}

          {result.synopsis && (
            <View
              style={[
                styles.card,
                {
                  backgroundColor: "rgba(136,77,255,0.05)",
                  borderColor: "rgba(136,77,255,0.2)",
                },
              ]}
            >
              <SectionLabel text="SYNOPSIS" />
              <Text style={[styles.cardValue, { color: colors.foreground, lineHeight: 22 }]}>
                {result.synopsis}
              </Text>
            </View>
          )}

          {result.cast && result.cast.length > 0 && (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <SectionLabel text="CAST" />
              <View style={styles.castList}>
                {result.cast.map((c, i) => (
                  <View key={i} style={styles.castRow}>
                    <View style={[styles.castAvatar, { backgroundColor: colors.muted }]}>
                      <Ionicons name="person" size={16} color={colors.mutedForeground} />
                    </View>
                    <View style={styles.castInfo}>
                      <Text style={[styles.castName, { color: colors.foreground }]}>{c.name}</Text>
                      {(c.role ?? c.character) && (
                        <Text style={[styles.castRole, { color: colors.mutedForeground }]}>
                          {c.character ?? c.role}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {(result.creator || result.creatorHandle || result.director || result.producer || result.musicDirector) && (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <SectionLabel text="CREW" />
              {(result.creator || result.creatorHandle) && (
                <View style={styles.crewRow}>
                  <Text style={[styles.crewLabel, { color: colors.mutedForeground }]}>Creator</Text>
                  <Text style={[styles.crewValue, { color: colors.foreground }]}>
                    {[result.creator, result.creatorHandle].filter(Boolean).join(" · ")}
                  </Text>
                </View>
              )}
              {result.director && (
                <View style={styles.crewRow}>
                  <Text style={[styles.crewLabel, { color: colors.mutedForeground }]}>Director</Text>
                  <Text style={[styles.crewValue, { color: colors.foreground }]}>{result.director}</Text>
                </View>
              )}
              {result.producer && (
                <View style={styles.crewRow}>
                  <Text style={[styles.crewLabel, { color: colors.mutedForeground }]}>Producer</Text>
                  <Text style={[styles.crewValue, { color: colors.foreground }]}>{result.producer}</Text>
                </View>
              )}
              {result.musicDirector && (
                <View style={styles.crewRow}>
                  <Text style={[styles.crewLabel, { color: colors.mutedForeground }]}>Music</Text>
                  <Text style={[styles.crewValue, { color: colors.foreground }]}>{result.musicDirector}</Text>
                </View>
              )}
            </View>
          )}

          {result.identificationClues && (
            <View
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <SectionLabel text="HOW IT WAS IDENTIFIED" />
              <Text
                style={[styles.cardValue, { color: colors.mutedForeground, fontStyle: "italic" }]}
              >
                {result.identificationClues}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { flexDirection: "row", alignItems: "center", width: 80 },
  backLabel: { fontSize: 17 },
  navTitle: { fontSize: 17, fontWeight: "600" },
  scroll: { gap: 0 },
  heroSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    padding: 24,
    paddingBottom: 28,
    overflow: "hidden",
  },
  ringColumn: {
    alignItems: "center",
  },
  heroInfo: { flex: 1, gap: 8 },
  heroTitle: { fontSize: 20, fontWeight: "700", lineHeight: 26 },
  heroSubtitle: { fontSize: 14 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: { fontSize: 13 },
  platformBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 2,
  },
  platformBadgeText: { fontSize: 12, fontWeight: "700" },
  stageBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 10,
    alignSelf: "center",
  },
  stageBadgeText: { fontSize: 12, fontWeight: "700" },
  cards: { padding: 16, gap: 10 },
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  cardValue: { fontSize: 15 },
  castList: { gap: 12 },
  castRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  castAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  castInfo: { flex: 1 },
  castName: { fontSize: 14, fontWeight: "600" },
  castRole: { fontSize: 13, marginTop: 1 },
  crewRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  crewLabel: { fontSize: 13 },
  crewValue: { fontSize: 14, fontWeight: "500" },
  errorState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 18, fontWeight: "600" },
});
