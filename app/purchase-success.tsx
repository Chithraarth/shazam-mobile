import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { useProfile } from "@/hooks/useProfile";
import { SCANS_PER_PACK } from "@/lib/billing";
import { Button, Chip, HeroIcon, Screen, TextLink, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

const CONFETTI = [
  { left: "12%", top: "14%", w: 14, h: 14, r: 4, c: "#6A2BFF", rot: "20deg" },
  { left: "82%", top: "10%", w: 12, h: 12, r: 6, c: "#F0600A", rot: "0deg" },
  { left: "74%", top: "30%", w: 18, h: 6, r: 3, c: "#C6FF3D", rot: "-30deg" },
  { left: "18%", top: "36%", w: 10, h: 10, r: 5, c: "#E0147A", rot: "0deg" },
  { left: "88%", top: "44%", w: 12, h: 12, r: 3, c: "#6A2BFF", rot: "40deg" },
] as const;

export default function PurchaseSuccess() {
  const t = useTheme();
  const router = useRouter();
  const { data: profile } = useProfile();
  return (
    <Screen>
      {CONFETTI.map((c, i) => (
        <View key={i} style={{ position: "absolute", left: c.left, top: c.top, width: c.w, height: c.h, borderRadius: c.r, backgroundColor: c.c, transform: [{ rotate: c.rot }] }} />
      ))}
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <HeroIcon icon="checkmark" />
        <Txt variant="overline" color="accent">Payment complete</Txt>
        <Text style={{ fontFamily: fonts.display[800], fontSize: 84, lineHeight: 90, color: t.accent }}>+{SCANS_PER_PACK}</Text>
        <Txt variant="title" size={24}>scans added</Txt>
        {profile ? <Chip label={`You now have ${profile.scansRemaining} scans`} tone="ok" /> : null}
        <Txt variant="caption" center>Your receipt is in your Google Play account.</Txt>
      </View>
      <Button title="Start scanning" onPress={() => router.replace("/")} />
      <TextLink title="See purchase history" onPress={() => router.replace("/purchases")} />
    </Screen>
  );
}
