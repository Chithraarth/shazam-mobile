import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
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
import { useProfile } from "@/hooks/useProfile";
import { SCANS_PER_PACK, useBilling } from "@/lib/billing";

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, signOut } = useAuth();
  const { data: profile } = useProfile();
  const billing = useBilling();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  };

  // Leave once a purchase made (or restored) while this screen is open has
  // been credited.
  const creditedOnOpen = useRef(billing.creditedCount);
  useEffect(() => {
    if (billing.creditedCount > creditedOnOpen.current) close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [billing.creditedCount]);

  useEffect(() => billing.clearError, []);

  if (!isSignedIn) return <Redirect href="/sign-in" />;

  const scansLeft = profile?.scansRemaining ?? 0;
  const { priceText } = billing;
  const canPurchase = billing.connected && !!billing.product && !billing.purchasing;
  const storeName = Platform.OS === "ios" ? "the App Store" : "Google Play";

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
          onPress={() => { Haptics.selectionAsync(); close(); }}
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
          <Text style={[styles.title, { color: colors.foreground }]}>
            {scansLeft > 0 ? "Get More Scans" : "You're Out of Scans"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {scansLeft > 0
              ? `You have ${scansLeft} scan${scansLeft === 1 ? "" : "s"} left. Add a ${SCANS_PER_PACK}-scan pack for ${priceText}.`
              : `Get a ${SCANS_PER_PACK}-scan pack for ${priceText} to keep identifying`}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.primary }]}>
          <View style={[styles.badge, { backgroundColor: "rgba(136,77,255,0.15)" }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{SCANS_PER_PACK} SCAN PACK</Text>
          </View>
          <Text style={[styles.price, { color: colors.foreground }]}>{priceText}</Text>
          <Text style={[styles.priceSub, { color: colors.mutedForeground }]}>
            One-time purchase · No subscription
          </Text>

          <View style={styles.featureList}>
            {[
              `${SCANS_PER_PACK} scan credits, use anytime`,
              "Identify any movie, show or episode",
              "Personalized to your region & language",
              "Works with 50+ streaming platforms",
              "Cast, synopsis, episode details",
              "Buy another pack whenever you run out",
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
              </View>
            ))}
          </View>

          {billing.pendingPayment && (
            <View style={styles.pendingBox}>
              <Ionicons name="time-outline" size={16} color="#fbbf24" />
              <Text style={styles.pendingText}>
                Your payment is still processing. Your scans will be added automatically once {storeName} confirms it.
              </Text>
            </View>
          )}

          {billing.error && <Text style={styles.error}>{billing.error}</Text>}

          <Pressable onPress={billing.buyScanPack} disabled={!canPurchase}>
            <LinearGradient
              colors={["#884dff", "#7c3aed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.buyBtn, !canPurchase && { opacity: 0.7 }]}
            >
              {billing.purchasing || !billing.connected || !billing.product ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buyBtnText}>Buy {SCANS_PER_PACK} Scans — {priceText}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Pressable onPress={billing.restorePurchases} disabled={billing.restoring} style={styles.restoreBtn}>
            {billing.restoring ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={[styles.restoreText, { color: colors.primary }]}>Restore purchases</Text>
            )}
          </Pressable>

          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            One-time purchase through {storeName}
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
  note: { fontSize: 12, textAlign: "center" },
  signOutBtn: { alignItems: "center", paddingVertical: 4 },
  signOutText: { fontSize: 13 },
  error: { color: "#f87171", fontSize: 13, textAlign: "center" },
  pendingBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "rgba(251,191,36,0.1)",
  },
  pendingText: { color: "#fbbf24", fontSize: 13, flex: 1, lineHeight: 18 },
  restoreBtn: { alignItems: "center", paddingVertical: 4, minHeight: 24 },
  restoreText: { fontSize: 14, fontWeight: "600" },
});
