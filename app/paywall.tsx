import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { useIAP, type Purchase, type ProductAndroid } from "expo-iap";
import { useColors } from "@/hooks/useColors";
import { useAuthedFetch, useProfile } from "@/hooks/useProfile";

const SCAN_PACK_SKU = process.env.EXPO_PUBLIC_SCAN_PACK_PRODUCT_ID ?? "";
const SCANS_PER_PACK = 50;

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn, user, signOut } = useAuth();
  const authedFetch = useAuthedFetch();
  const { data: profile, refetch } = useProfile();

  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifyAndFinish = useCallback(
    async (purchase: Purchase) => {
      const purchaseToken = purchase.purchaseToken;
      if (!purchaseToken) {
        setPurchaseLoading(false);
        return;
      }
      try {
        const res = await authedFetch("/api/billing/verify", {
          method: "POST",
          body: JSON.stringify({ purchaseToken, productId: purchase.productId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error((data as { error?: string }).error ?? "Could not verify purchase");
        }
        // Consumable: the user must be able to buy this pack again once
        // they've used up the credits it granted.
        await finishTransaction({ purchase, isConsumable: true });
        await refetch();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Purchase verification failed. Please try again.");
      } finally {
        setPurchaseLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authedFetch, refetch, router]
  );

  const { connected, products, fetchProducts, requestPurchase, finishTransaction } = useIAP({
    onPurchaseSuccess: verifyAndFinish,
    onPurchaseError: (err) => {
      setPurchaseLoading(false);
      // The user backing out of the native purchase sheet isn't an error.
      if (err.code !== "user-cancelled") {
        setError(err.message);
      }
    },
  });

  useEffect(() => {
    if (connected && SCAN_PACK_SKU) {
      fetchProducts({ skus: [SCAN_PACK_SKU], type: "in-app" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if ((profile?.scansRemaining ?? 0) > 0) return <Redirect href="/" />;

  const product = products.find((p) => p.id === SCAN_PACK_SKU) as ProductAndroid | undefined;
  const priceText = product?.displayPrice ?? "₹200";
  const canPurchase = connected && !!product && !purchaseLoading;

  const handlePurchase = async () => {
    if (!product || !user) return;
    setError(null);
    setPurchaseLoading(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await requestPurchase({
        request: {
          google: {
            skus: [SCAN_PACK_SKU],
            obfuscatedAccountId: user.uid,
          },
        },
        type: "in-app",
      });
      // Resolution happens via onPurchaseSuccess/onPurchaseError above.
    } catch (e) {
      setPurchaseLoading(false);
      setError(e instanceof Error ? e.message : "Could not start purchase. Please try again.");
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
          <Text style={[styles.title, { color: colors.foreground }]}>You're Out of Scans</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Grab another {SCANS_PER_PACK}-scan pack for just {priceText} to keep identifying
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

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={handlePurchase} disabled={!canPurchase}>
            <LinearGradient
              colors={["#884dff", "#7c3aed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.buyBtn, !canPurchase && { opacity: 0.7 }]}
            >
              {purchaseLoading || !connected ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.buyBtnText}>Buy {SCANS_PER_PACK} Scans — {priceText}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </LinearGradient>
          </Pressable>

          <Text style={[styles.note, { color: colors.mutedForeground }]}>
            Secure checkout powered by Google Play
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
});
