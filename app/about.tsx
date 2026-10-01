import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import * as StoreReview from "expo-store-review";
import React from "react";
import { Text, View } from "react-native";
import { emailSupport, openPrivacy, openStoreListing, openTerms } from "@/lib/links";
import { Card, Divider, Gradient, ListRow, Screen, TopBar, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

// Screens 45 & 46. Terms and Privacy open the published pages in an in-app
// browser, so the app never shows an outdated copy.
export default function About() {
  const t = useTheme();
  const rate = async () => {
    if (await StoreReview.hasAction()) StoreReview.requestReview();
    else openStoreListing();
  };
  return (
    <Screen scroll>
      <TopBar />
      <View style={{ alignItems: "center", gap: 10, marginVertical: 12 }}>
        <Gradient style={{ width: 96, height: 96, borderRadius: 32, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="scan" size={46} color="#fff" />
        </Gradient>
        <Text style={{ fontFamily: fonts.display[800], fontSize: 28, color: t.ink }}>videofy</Text>
        <Txt variant="caption">
          Version {Application.nativeApplicationVersion ?? "–"} ({Application.nativeBuildVersion ?? "–"})
        </Txt>
      </View>
      <Card>
        <ListRow title="Terms of Service" chevron onPress={openTerms} />
        <Divider />
        <ListRow title="Privacy Policy" chevron onPress={openPrivacy} />
        <Divider />
        <ListRow title="Rate Videofy" chevron onPress={rate} />
        <Divider />
        <ListRow title="Contact support" chevron onPress={() => emailSupport("Videofy feedback")} />
      </Card>
    </Screen>
  );
}
