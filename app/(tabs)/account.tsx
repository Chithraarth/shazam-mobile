import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Text, View } from "react-native";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";
import { SCANS_PER_PACK, useBilling } from "@/lib/billing";
import { useHistory } from "@/lib/history-store";
import { Button, Card, Dialog, Divider, IconButton, ListRow, RingAvatar, Screen, Skeleton, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

function Stat({ value, label, accent }: { value: number | string; label: string; accent?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontFamily: fonts.display[700], fontSize: 24, color: accent ? t.accent : t.ink }}>{value}</Text>
      <Txt variant="caption" style={{ fontFamily: fonts.body[700], fontSize: 12 }}>{label}</Txt>
    </View>
  );
}

export default function MeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { items } = useHistory();
  const billing = useBilling();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const name = user?.displayName || null;
  const contact = profile?.email ?? user?.email ?? user?.phoneNumber ?? "Signed in";
  const found = items.filter((i) => i.result.found).length;
  const saved = items.filter((i) => i.saved).length;

  return (
    <Screen scroll tabBar>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
        <Txt variant="title">Me</Txt>
        <IconButton icon="settings-outline" label="Settings" onPress={() => router.push("/settings")} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
        <RingAvatar name={name ?? undefined} icon={name ? undefined : "person"} size={78} />
        <View style={{ flex: 1, gap: 4 }}>
          {isLoading ? (
            <>
              <Skeleton width={160} height={20} />
              <Skeleton width={200} height={14} />
            </>
          ) : (
            <>
              <Txt variant="strong" size={18} numberOfLines={1}>{name ?? "Your account"}</Txt>
              <Txt variant="caption" numberOfLines={1}>{contact}</Txt>
            </>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row" }}>
        <Stat value={items.length} label="Scans" />
        <Stat value={found} label="Found" />
        <Stat value={profile?.scansRemaining ?? "–"} label="Left" accent />
      </View>

      <View style={{ flexDirection: "row", gap: 8 }}>
        <Button title={`Buy ${SCANS_PER_PACK} scans · ${billing.priceText}`} onPress={() => router.push("/paywall")} height={48} style={{ flex: 2 }} />
        <Button title="Edit vibe" variant="secondary" onPress={() => router.push("/preferences")} height={48} style={{ flex: 1 }} />
      </View>

      <Card>
        <ListRow icon="bookmark-outline" title="Saved titles" value={saved ? String(saved) : undefined} chevron onPress={() => router.push("/saved")} />
        <Divider />
        <ListRow icon="receipt-outline" title="Purchase history" chevron onPress={() => router.push("/purchases")} />
        <Divider />
        <ListRow icon="refresh" title={billing.restoring ? "Restoring…" : "Restore purchases"} onPress={billing.restorePurchases} />
      </Card>

      <Card>
        <ListRow icon="help-buoy-outline" title="Help & FAQ" chevron onPress={() => router.push("/help")} />
        <Divider />
        <ListRow icon="information-circle-outline" title="About Videofy" chevron onPress={() => router.push("/about")} />
        <Divider />
        <ListRow icon="log-out-outline" title="Sign out" onPress={() => setConfirmSignOut(true)} />
      </Card>

      <Card>
        <ListRow icon="trash-outline" title="Delete account" danger chevron onPress={() => router.push("/delete-account")} />
      </Card>

      <Dialog
        visible={confirmSignOut}
        title="Sign out?"
        message={`Your ${profile?.scansRemaining ?? 0} scans stay with your account. Sign back in any time.`}
        primary={{ title: "Sign out", onPress: async () => { setConfirmSignOut(false); await signOut(); } }}
        secondary={{ title: "Stay signed in", onPress: () => setConfirmSignOut(false) }}
        onClose={() => setConfirmSignOut(false)}
      />
    </Screen>
  );
}
