import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { Unbounded_500Medium, Unbounded_700Bold, Unbounded_800ExtraBold } from "@expo-google-fonts/unbounded";
import { useFonts } from "expo-font";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useUpdateRequired } from "@/lib/api";
import { ShareIntentHandler, WidgetSync } from "@/lib/app-effects";
import { PushManager } from "@/lib/push";
import { BackgroundScanSync } from "@/lib/background-scan";
import { ShareIntentProvider } from "expo-share-intent";
import { setBaseUrl } from "@/lib/api-client";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { BillingProvider } from "@/lib/billing";
import { HistoryProvider } from "@/lib/history-store";
import { onSessionExpired } from "@/lib/session-events";
import { SettingsProvider, useSettings } from "@/lib/settings";
import { Dialog } from "@/ui/components";
import { Splash } from "@/ui/Splash";
import { ThemeProvider, useTheme } from "@/ui/theme";
import { UpdateRequired } from "@/ui/UpdateRequired";

setBaseUrl(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function SessionExpiredDialog() {
  const { isSignedIn, signOut } = useAuth();
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  useEffect(() => onSessionExpired(() => setVisible(true)), []);
  return (
    <Dialog
      visible={visible && isSignedIn}
      icon="lock-closed"
      title="Sign in again"
      message="For your security you’ve been signed out. Your scans and history are safe."
      primary={{
        title: "Sign in",
        onPress: async () => {
          setVisible(false);
          await signOut();
          router.replace("/sign-in");
        },
      }}
    />
  );
}

function AppShell() {
  const t = useTheme();
  const updateRequired = useUpdateRequired();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(t.bg).catch(() => {});
  }, [t.bg]);

  if (updateRequired) {
    return (
      <>
        <StatusBar style="light" />
        <UpdateRequired />
      </>
    );
  }

  return (
    <>
      <StatusBar style={t.isDark ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg }, animation: "slide_from_right" }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: "fade" }} />
        <Stack.Screen name="identifying" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="result" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="paywall" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
        <Stack.Screen name="purchase-success" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="share" options={{ presentation: "modal", animation: "slide_from_bottom" }} />
      </Stack>
      <SessionExpiredDialog />
      <PushManager />
      <BackgroundScanSync />
      <ShareIntentHandler />
      <WidgetSync />
    </>
  );
}

function Root() {
  const { loaded: settingsLoaded } = useSettings();
  const [fontsLoaded, fontError] = useFonts({
    Unbounded_500Medium,
    Unbounded_700Bold,
    Unbounded_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const ready = (fontsLoaded || !!fontError) && settingsLoaded;

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!ready) return <Splash />;

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BillingProvider>
          <HistoryProvider>
            <ShareIntentProvider>
              <AppShell />
            </ShareIntentProvider>
          </HistoryProvider>
        </BillingProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SettingsProvider>
            <AuthProvider>
              <Root />
            </AuthProvider>
          </SettingsProvider>
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
