import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { usePushControls } from "@/lib/push";
import { useSettings, ThemePreference } from "@/lib/settings";
import { Card, Divider, ListRow, Screen, Segmented, Toggle, TopBar, Txt } from "@/ui/components";

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, update } = useSettings();
  const [cacheCleared, setCacheCleared] = useState(false);
  const push = usePushControls();

  return (
    <Screen scroll>
      <TopBar title="Settings" />
      <Txt variant="overline">Theme</Txt>
      <Segmented<ThemePreference>
        value={settings.theme}
        onChange={(theme) => update({ theme })}
        options={[{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }, { value: "system", label: "Auto" }]}
      />
      <Card>
        <ListRow title="Haptics" subtitle="Little vibrations on taps and results" right={<Toggle label="Haptics" value={settings.haptics} onChange={(haptics) => update({ haptics })} />} />
        <Divider />
        <ListRow
          title="Keep scan thumbnails"
          subtitle="Saves the frame you scanned on this phone"
          right={<Toggle label="Keep scan thumbnails" value={settings.keepThumbnails} onChange={(keepThumbnails) => update({ keepThumbnails })} />}
        />
      </Card>
      <Txt variant="overline">Notifications</Txt>
      <Card>
        <ListRow
          title="Payments & refunds"
          subtitle="When scans are added or a pack is refunded"
          right={<Toggle label="Payment notifications" value={settings.pushEnabled} onChange={(on) => (on ? push.enable() : push.disable())} />}
        />
      </Card>
      <Card>
        <ListRow
          title="Clear image cache"
          value={cacheCleared ? "Cleared" : undefined}
          onPress={async () => {
            await Promise.all([Image.clearDiskCache(), Image.clearMemoryCache()]).catch(() => {});
            setCacheCleared(true);
          }}
        />
        <Divider />
        <ListRow title="Your vibe" subtitle="Country, languages and feed" chevron onPress={() => router.push("/preferences")} />
        <Divider />
        <ListRow title="About Videofy" chevron onPress={() => router.push("/about")} />
      </Card>
    </Screen>
  );
}
