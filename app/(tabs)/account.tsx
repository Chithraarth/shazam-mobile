import AsyncStorage from "@react-native-async-storage/async-storage";
import { useClerk, useUser } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/hooks/useProfile";
import { historyKeyFor, LocalHistoryItem } from "./history";

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: "rgba(136,77,255,0.05)",
          borderColor: "rgba(136,77,255,0.2)",
        },
      ]}
    >
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { data: profile } = useProfile();
  const [stats, setStats] = useState({ total: 0, found: 0 });

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          const raw = await AsyncStorage.getItem(historyKeyFor(user?.id));
          const data: LocalHistoryItem[] = raw ? JSON.parse(raw) : [];
          setStats({
            total: data.length,
            found: data.filter((d) => d.found).length,
          });
        } catch {
          /* ignore */
        }
      })();
    }, [user?.id])
  );

  const handleSignOut = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await signOut();
  };

  const successRate =
    stats.total > 0 ? Math.round((stats.found / stats.total) * 100) : 0;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(136,77,255,0.08)", colors.background]}
        start={{ x: 1, y: 0 }}
        end={{ x: 0, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: topPad + 16,
            paddingBottom: Platform.OS === "web" ? 34 + 84 : 120,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logoRow}>
          <LinearGradient
            colors={["#884dff", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Ionicons name="person" size={26} color="#fff" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={[styles.appName, { color: colors.foreground }]} numberOfLines={1}>
              {profile?.email ?? "Your Account"}
            </Text>
            <View style={styles.memberRow}>
              <Ionicons
                name={profile?.hasActiveSubscription ? "diamond" : "person-circle-outline"}
                size={12}
                color={profile?.hasActiveSubscription ? "#fbbf24" : "#9ca3af"}
              />
              <Text style={[styles.appSub, { color: colors.mutedForeground }]}>
                {profile?.hasActiveSubscription ? "Yearly Member" : "Free Plan"}
              </Text>
            </View>
          </View>
        </View>

        {stats.total > 0 && (
          <View style={styles.statsRow}>
            <StatCard icon="🎬" value={String(stats.total)} label="Scans" />
            <StatCard icon="✅" value={String(stats.found)} label="Found" />
            <StatCard icon="📊" value={`${successRate}%`} label="Success" />
          </View>
        )}

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.prefsHeader}>
            <Text style={[styles.infoTitle, { color: colors.foreground }]}>Your Preferences</Text>
            <Pressable onPress={() => router.push("/onboarding")}>
              <Text style={[styles.editLink, { color: colors.primary }]}>Edit</Text>
            </Pressable>
          </View>
          {[
            { icon: "location-outline", label: "Country", value: profile?.country ?? "Not set" },
            { icon: "language-outline", label: "Language", value: profile?.language ?? "Not set" },
            {
              icon: "film-outline",
              label: "Content",
              value:
                profile?.contentRegions && profile.contentRegions.length > 0
                  ? profile.contentRegions.join(", ")
                  : "Not set",
            },
          ].map(({ icon, label, value }) => (
            <View key={label} style={styles.infoRow}>
              <Ionicons name={icon as any} size={20} color={colors.primary} />
              <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: colors.foreground }]} numberOfLines={2}>
                {value}
              </Text>
            </View>
          ))}
        </View>

        <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.foreground }]}>How to scan</Text>
          {[
            { icon: "camera-outline", text: "Point your camera at any screen" },
            { icon: "cloud-upload-outline", text: "Or upload a screenshot / photo" },
            { icon: "sparkles-outline", text: "AI identifies the movie or show instantly" },
          ].map(({ icon, text }) => (
            <View key={text} style={styles.infoRow}>
              <Ionicons name={icon as any} size={20} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>{text}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [
            styles.signOutBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="log-out-outline" size={20} color="#f87171" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>

        <Text style={[styles.version, { color: colors.mutedForeground }]}>
          Videofy · v1.0.0
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 20 },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: { fontSize: 18, fontWeight: "700" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  appSub: { fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 4,
  },
  statIcon: { fontSize: 20 },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 12 },
  infoCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  prefsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  editLink: { fontSize: 14, fontWeight: "600" },
  infoTitle: { fontSize: 16, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  infoLabel: { fontSize: 14, width: 76 },
  infoValue: { fontSize: 14, flex: 1, fontWeight: "500" },
  infoText: { fontSize: 14, flex: 1 },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
  },
  signOutText: { fontSize: 15, fontWeight: "600", color: "#f87171" },
  version: { fontSize: 12, textAlign: "center" },
});
