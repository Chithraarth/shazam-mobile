import { useAuth } from "@/lib/auth-context";
import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Redirect, Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useProfile } from "@/hooks/useProfile";

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "viewfinder", selected: "viewfinder.circle.fill" }} />
        <Label>Scan</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <Icon sf={{ default: "clock", selected: "clock.fill" }} />
        <Label>History</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: "person", selected: "person.fill" }} />
        <Label>Account</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: isWeb ? 1 : StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View
              style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}
            />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="viewfinder.circle.fill" tintColor={color} size={24} />
            ) : (
              <Ionicons name="scan" size={24} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="clock.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="clock" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="person.fill" tintColor={color} size={24} />
            ) : (
              <Feather name="user" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { data: profile, isLoading, isError, error, refetch, isRefetching } = useProfile();

  if (!isLoaded || (isSignedIn && isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!isSignedIn) return <Redirect href="/sign-in" />;
  if (isError || !profile) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: colors.background, paddingHorizontal: 32 }}>
        <Text style={{ color: colors.foreground, fontSize: 17, fontWeight: "600", textAlign: "center" }}>
          Couldn't load your account
        </Text>
        <Text style={{ color: colors.mutedForeground, fontSize: 14, textAlign: "center" }}>
          Check your connection and try again.
        </Text>
        {error instanceof Error && (
          <Text style={{ color: colors.mutedForeground, fontSize: 12, textAlign: "center", opacity: 0.7 }}>
            {error.message}
          </Text>
        )}
        <Pressable
          onPress={() => refetch()}
          disabled={isRefetching}
          style={{ backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, opacity: isRefetching ? 0.7 : 1 }}
        >
          {isRefetching ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>Retry</Text>
          )}
        </Pressable>
        <Pressable onPress={() => signOut()}>
          <Text style={{ color: colors.mutedForeground, fontSize: 14, fontWeight: "600" }}>Sign out</Text>
        </Pressable>
      </View>
    );
  }
  if (!profile.onboardingComplete) return <Redirect href="/onboarding" />;

  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
