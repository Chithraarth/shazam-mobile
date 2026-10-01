import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";
import { emailSupport } from "@/lib/links";
import { SCANS_PER_PACK, useBilling } from "@/lib/billing";
import { Button, Card, Divider, Gradient, HeroIcon, IconButton, ListRow, Screen, Sticker, TextLink, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

function Feature({ text }: { text: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: t.lime, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="checkmark" size={15} color={t.onLime} />
      </View>
      <Txt variant="strong" style={{ flex: 1 }}>{text}</Txt>
    </View>
  );
}

export default function Paywall() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { data: profile } = useProfile();
  const billing = useBilling();
  const store = Platform.OS === "ios" ? "the App Store" : "Google Play";
  const scansLeft = profile?.scansRemaining ?? 0;

  const close = () => (router.canGoBack() ? router.back() : router.replace("/"));

  // A purchase credited while this screen is open shows the success screen.
  const creditedOnOpen = useRef(billing.creditedCount);
  useEffect(() => {
    if (billing.creditedCount > creditedOnOpen.current) router.replace("/purchase-success");
  }, [billing.creditedCount, router]);

  useEffect(() => billing.clearError, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isSignedIn) return <Redirect href="/sign-in" />;

  // Screen 30: a UPI/cash payment the store hasn't confirmed yet, or a paid
  // purchase our server couldn't confirm yet (retried automatically).
  if (billing.pendingPayment || billing.unconfirmed) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <HeroIcon icon="time-outline" variant="soft" />
          <Txt variant="title" center>
            Almost <Txt variant="title" color="accent">there</Txt>
          </Txt>
          <Txt center>
            {billing.pendingPayment
              ? `Your payment is processing. We’ll add ${SCANS_PER_PACK} scans automatically once ${store} confirms it — you can close this.`
              : `Payment received. We’re confirming it with ${store} and will add your ${SCANS_PER_PACK} scans automatically.`}
          </Txt>
          <Card style={{ alignSelf: "stretch" }}>
            <ListRow icon="checkmark-circle" title="Payment started" />
            <Divider />
            <ListRow icon="hourglass-outline" title="Waiting for your bank" />
            <Divider />
            <ListRow icon="ellipse-outline" title="Scans added" />
          </Card>
        </View>
        <Button title="Back to scanning" variant="secondary" onPress={close} />
        <TextLink title={billing.restoring ? "Checking…" : "Check again"} onPress={billing.restorePurchases} />
      </Screen>
    );
  }

  // Screen 31: the purchase itself failed.
  if (billing.error) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <HeroIcon icon="close" variant="danger" />
          <Txt variant="title" center>
            Payment <Txt variant="title" color="accent">didn’t go through</Txt>
          </Txt>
          <Txt center>{billing.error}</Txt>
          <Txt variant="caption" center>If money left your account, {store} refunds it automatically within 3–5 working days.</Txt>
        </View>
        <Button title="Try again" onPress={() => { billing.clearError(); billing.buyScanPack(); }} loading={billing.purchasing} />
        <Button title="Back" variant="secondary" onPress={billing.clearError} />
        <TextLink title="Contact support" onPress={() => emailSupport("Payment problem", billing.error ?? "")} />
      </Screen>
    );
  }

  const canBuy = billing.available && billing.connected && !!billing.product;

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        <Gradient style={{ height: 380 + insets.top, paddingTop: insets.top + 12, paddingHorizontal: 24, overflow: "hidden" }}>
          <View style={{ position: "absolute", left: -60, bottom: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: "rgba(255,255,255,0.12)" }} />
          <View style={{ position: "absolute", right: -40, top: insets.top + 60, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.1)" }} />
          <View style={{ alignItems: "flex-end" }}>
            <IconButton icon="close" label="Close" variant="glass" onPress={close} />
          </View>
          <View style={{ marginTop: 30, gap: 2 }}>
            <Text style={{ fontFamily: fonts.body[800], fontSize: 13, letterSpacing: 1.2, color: "#fff" }}>
              {scansLeft > 0 ? `YOU HAVE ${scansLeft} SCANS LEFT` : "YOU’RE OUT OF SCANS"}
            </Text>
            <Text style={{ fontFamily: fonts.display[800], fontSize: 132, lineHeight: 136, color: "#fff", letterSpacing: -4 }}>{SCANS_PER_PACK}</Text>
            <Text style={{ fontFamily: fonts.display[700], fontSize: 28, color: "#fff" }}>more scans</Text>
          </View>
          <Sticker label="≈ ₹10 / scan" size={14} style={{ position: "absolute", right: 24, bottom: 40 }} />
        </Gradient>

        <View style={{ padding: 20, gap: 16, flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ gap: 2 }}>
              <Txt variant="strong">One-time pack</Txt>
              <Txt variant="caption">No subscription · never expires</Txt>
            </View>
            <Text style={{ fontFamily: fonts.display[800], fontSize: 34, color: t.ink }}>{billing.priceText}</Text>
          </View>
          <View style={{ gap: 10 }}>
            <Feature text="Movies, shows, episodes & Reels" />
            <Feature text="Cast, story and where to watch" />
            <Feature text="Your scan is given back if anything fails on our side" />
          </View>
          <View style={{ flex: 1 }} />
          {!billing.available ? <Txt variant="caption" center>Purchases are only available in the mobile app.</Txt> : null}
          <Button
            title={canBuy ? `Buy ${SCANS_PER_PACK} scans · ${billing.priceText}` : "Connecting to the store…"}
            onPress={billing.buyScanPack}
            loading={billing.purchasing}
            disabled={!canBuy}
            height={60}
          />
          <TextLink title={billing.restoring ? "Restoring…" : "Restore purchases"} onPress={billing.restorePurchases} />
          <Txt variant="caption" center>Paid securely through {store}</Txt>
        </View>
      </ScrollView>
    </View>
  );
}
