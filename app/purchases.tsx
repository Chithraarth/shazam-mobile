import React from "react";
import { Platform, Text, View } from "react-native";
import { usePurchases } from "@/lib/api";
import { useBilling } from "@/lib/billing";
import { emailSupport } from "@/lib/links";
import { Button, Card, Chip, Divider, Gradient, Screen, Skeleton, TextLink, TopBar, Txt } from "@/ui/components";
import { fonts } from "@/ui/theme";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function Purchases() {
  const { data, isLoading, isError, refetch } = usePurchases();
  const billing = useBilling();
  const total = (data ?? []).filter((p) => !p.refunded).reduce((n, p) => n + p.scansGranted, 0);

  return (
    <Screen scroll>
      <TopBar title="Purchases" />
      <Gradient style={{ borderRadius: 26, padding: 20, flexDirection: "row", justifyContent: "space-between" }}>
        <View>
          <Text style={{ fontFamily: fonts.body[800], fontSize: 12, color: "rgba(255,255,255,0.85)" }}>SCANS BOUGHT</Text>
          <Text style={{ fontFamily: fonts.display[800], fontSize: 30, color: "#fff" }}>{isLoading ? "–" : total}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontFamily: fonts.body[800], fontSize: 12, color: "rgba(255,255,255,0.85)" }}>PACKS</Text>
          <Text style={{ fontFamily: fonts.display[800], fontSize: 30, color: "#fff" }}>{isLoading ? "–" : (data ?? []).length}</Text>
        </View>
      </Gradient>

      {isLoading ? (
        <View style={{ gap: 10 }}>
          <Skeleton height={64} radius={20} />
          <Skeleton height={64} radius={20} />
          <Skeleton height={64} radius={20} />
        </View>
      ) : isError ? (
        <Card padded style={{ gap: 10 }}>
          <Txt variant="strong">Couldn’t load your purchases</Txt>
          <Button title="Try again" variant="secondary" height={46} onPress={() => refetch()} />
        </Card>
      ) : data && data.length ? (
        <Card>
          {data.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <Divider /> : null}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16 }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="strong" style={p.refunded ? { textDecorationLine: "line-through" } : null}>{p.scansGranted} scans</Txt>
                  <Txt variant="caption">{fmtDate(p.createdAt)} · {p.platform === "ios" ? "App Store" : "Google Play"}</Txt>
                </View>
                <Chip label={p.refunded ? "Refunded" : "Paid"} tone={p.refunded ? "default" : "ok"} small />
              </View>
            </View>
          ))}
        </Card>
      ) : (
        <Card padded style={{ gap: 6 }}>
          <Txt variant="strong">No purchases yet</Txt>
          <Txt variant="caption">Scan packs you buy will show up here.</Txt>
        </Card>
      )}

      <Txt variant="caption">
        Receipts with prices and order numbers are in {Platform.OS === "ios" ? "your Apple ID → Purchase History" : "Google Play → Payments & subscriptions → Budget & history"}.
      </Txt>
      <View style={{ flex: 1 }} />
      <Button title={billing.restoring ? "Restoring…" : "Restore purchases"} variant="secondary" onPress={billing.restorePurchases} loading={billing.restoring} />
      <TextLink title="Problem with a payment?" onPress={() => emailSupport("Payment problem")} />
    </Screen>
  );
}
