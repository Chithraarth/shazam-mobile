import { useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React from "react";
import { Linking, Text, View } from "react-native";
import { useProfile } from "@/hooks/useProfile";
import { SCANS_PER_PACK, useBilling } from "@/lib/billing";
import { usePushControls } from "@/lib/push";
import { useSettings } from "@/lib/settings";
import { Button, Card, Divider, HeroIcon, ListRow, Screen, TextLink, Toggle, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

// Screen H: last onboarding step. Asks for the camera up front (with context)
// rather than at the first scan.
export default function Permissions() {
  const t = useTheme();
  const router = useRouter();
  const [permission, request] = useCameraPermissions();
  const { data: profile } = useProfile();
  const { priceText } = useBilling();
  const granted = !!permission?.granted;
  const hasScans = (profile?.scansRemaining ?? 0) > 0;
  const { settings } = useSettings();
  const push = usePushControls();

  const toggleCamera = async () => {
    if (granted) return;
    if (permission && !permission.canAskAgain) {
      Linking.openSettings();
      return;
    }
    await request();
  };

  return (
    <Screen scroll>
      <View style={{ alignItems: "center", gap: 12, marginTop: 30 }}>
        <HeroIcon icon="checkmark" size={96} />
        <Txt variant="title" center>
          You’re <Txt variant="title" color="accent">all set!</Txt>
        </Txt>
        <Txt center>Two quick permissions and you’re ready to scan.</Txt>
      </View>

      <Card>
        <ListRow
          icon="camera-outline"
          title="Camera"
          subtitle={granted ? "Allowed — one photo when you tap Scan" : "One photo when you tap Scan. No video, no sound."}
          right={<Toggle value={granted} onChange={toggleCamera} label="Allow camera" />}
        />
        <Divider />
        <ListRow
          icon="notifications-outline"
          title="Notifications"
          subtitle="Only for payments and refunds"
          right={<Toggle value={settings.pushEnabled} onChange={(on) => (on ? push.enable() : push.disable())} label="Payment notifications" />}
        />
      </Card>

      {!hasScans ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 24, backgroundColor: t.surface2 }}>
          <Text style={{ fontFamily: fonts.display[800], fontSize: 22, color: t.accent }}>{SCANS_PER_PACK}</Text>
          <Txt variant="strong" style={{ flex: 1 }}>scans for {priceText} — grab a pack when you’re ready.</Txt>
        </View>
      ) : null}

      <View style={{ flex: 1 }} />
      <Button title="Start scanning" onPress={() => router.replace("/")} />
      {!hasScans ? <TextLink title="See scan packs" onPress={() => router.push("/paywall")} /> : null}
    </Screen>
  );
}
