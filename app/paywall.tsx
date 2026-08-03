import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuthedFetch, useProfile } from "@/hooks/useProfile";

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const authedFetch = useAuthedFetch();
  const { data: profile, refetch, isRefetching } = useProfile();

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollForAccess = async () => {
    setPolling(true);
    try {
      for (let i = 0; i < 20; i++) {
        const { data } = await refetch();
        if (data?.hasActiveSubscription) {
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.replace("/");
          return;
        }
        await new Promise((r) => setTimeout(r, 3000));
      }
    } finally {
      setPolling(false);
    }
  };

  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (profile?.hasActiveSubscription) return <Redirect href="/" />;

  const handleCheckout = async () => {
    setError(null);
    setCheckoutLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const res = await authedFetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data as { url?: string }).url) {
        throw new Error((data as { error?: string }).error ?? "Could not start checkout");
      }
      await WebBrowser.openBrowserAsync((data as { url: string }).url);
      pollForAccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleRefresh = async () => {
    const { data } = await refetch();
    if (data?.hasActiveSubscription) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(136,77,255,0.14)", colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 32,
            paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          onPress={() => { Haptics.selectionAsync(); if (router.canGoBack()) router.back(); else router.replace("/"); }}
          hitSlop={12}
          style={styles.closeBtn}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </Pressable>
        <View style={styles.header}>
          <LinearGradient
            colors={["#884dff", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Ionicons name="film" size={30} color="#fff" />
          </LinearGradient>
          <Text style={[styles.title, { color: colors.foreground }]}>One Last Step</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Unlock unlimited AI-powered identification for just ₹799 a year (or your local currency equivalent)
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={[styles.badge, { backgroundColor: "rgba(136,77,255,0.15)" }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>YEARLY PLAN</Text>
          </View>
          <Text style={[styles.price, { color: colors.foreground }]}>₹799/year</Text>
          <Text style={[styles.priceSub, { color: colors.mutedForeground }]}>
            Billed yearly · Cancel anytime
          </Text>

          <View style={styles.featureList}>
            {[
              "Unlimited scans on all your devices",
              "Identify any movie, show or episode",
              "Personalized to your region & language",
              "Works with 50+ streaming platforms",
              "Cast, synopsis, episode details",
              "Full scan history & stats",
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
              </View>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={handleCheckout} disabled={checkoutLoading}>
            <LinearGradient
              colors={["#884dff", "#7c3aed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.buyBtn, checkoutLoading && { opacity: 0.7 }]}
            >
              {checkoutLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buyBtnText}>Subscribe — ₹799/year</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={handleRefresh} disabled={isRefetching || polling} style={styles.refreshBtn}>
            {isRefetching || polling ? (
              <View style={styles.pollingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                {polling && (
                  <Text style={[styles.refreshText, { color: colors.mutedForeground }]}>
                    Checking payment status…
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[styles.refreshText, { color: colors.primary }]}>
                I've completed my payment
              </Text>
            )}
          </Pressable>

          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Secure checkout powered by Stripe
          </Text>
        </View>

        <Pressable onPress={() => signOut()} style={styles.signOutBtn}>
          <Text style={[styles.signOutText, { color: colors.mutedForeground }]}>
            Signed in as {profile?.email ?? "you"} · Sign out
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 24 },
  header: { alignItems: "center", gap: 10 },
  closeBtn: {
    alignSelf: "flex-end",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 4,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14, textAlign: "center", lineHeight: 20, paddingHorizontal: 12 },
  card: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 22,
    gap: 14,
  },
  badge: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  price: { fontSize: 44, fontWeight: "800" },
  priceSub: { fontSize: 13, marginTop: -8 },
  featureList: { gap: 10, marginVertical: 4 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureText: { fontSize: 14, flex: 1 },
  buyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  buyBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  refreshBtn: { alignItems: "center", paddingVertical: 6 },
  pollingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  refreshText: { fontSize: 14, fontWeight: "600" },
  note: { fontSize: 12, textAlign: "center" },
  signOutBtn: { alignItems: "center", paddingVertical: 4 },
  signOutText: { fontSize: 13 },
  error: { color: "#f87171", fontSize: 13, textAlign: "center" },
});
