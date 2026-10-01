import { Redirect, Tabs } from "expo-router";
import React from "react";
import { View } from "react-native";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings";
import { Button, HeroIcon, Txt } from "@/ui/components";
import { Splash } from "@/ui/Splash";
import { TabBar } from "@/ui/TabBar";
import { useTheme } from "@/ui/theme";

export default function TabLayout() {
  const t = useTheme();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { settings } = useSettings();
  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useProfile();

  if (!isLoaded || (isSignedIn && isLoading)) return <Splash busy />;
  if (!isSignedIn) return <Redirect href={settings.introSeen ? "/sign-in" : "/welcome"} />;
  if (isError || !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
        <HeroIcon icon="cloud-offline-outline" variant="soft" />
        <Txt variant="title" center>Couldn’t load your account</Txt>
        <Txt center>{error instanceof Error ? error.message : "Check your connection and try again."}</Txt>
        <Button title="Try again" onPress={() => refetch()} loading={isRefetching} style={{ alignSelf: "stretch" }} />
        <Button title="Sign out" variant="ghost" onPress={() => signOut()} style={{ alignSelf: "stretch" }} />
      </View>
    );
  }
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;

  return (
    <Tabs initialRouteName="index" tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg } }}>
      <Tabs.Screen name="history" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
