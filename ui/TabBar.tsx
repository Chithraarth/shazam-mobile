import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { triggerScan } from "@/lib/scan-trigger";
import { Gradient, IconName } from "./components";
import { fonts, useHaptics, useTheme } from "./theme";

const SIDE_TABS: Record<string, { label: string; icon: IconName; iconOn: IconName }> = {
  history: { label: "History", icon: "time-outline", iconOn: "time" },
  account: { label: "Me", icon: "person-circle-outline", iconOn: "person-circle" },
};

// Floating pill with the Scan button raised in the middle. On the Scan tab
// that button is the shutter; elsewhere it jumps to the Scan tab.
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const haptics = useHaptics();
  const current = state.routes[state.index]?.name;

  const side = (name: "history" | "account") => {
    const cfg = SIDE_TABS[name];
    const on = current === name;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        accessibilityLabel={cfg.label}
        onPress={() => { haptics.tap(); navigation.navigate(name); }}
        style={{ alignItems: "center", gap: 3, minWidth: 72, paddingVertical: 6 }}
      >
        <Ionicons name={on ? cfg.iconOn : cfg.icon} size={24} color={on ? t.accent : t.muted} />
        <Text style={{ fontFamily: fonts.body[700], fontSize: 11, color: on ? t.ink : t.muted }}>{cfg.label}</Text>
      </Pressable>
    );
  };

  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 16, right: 16, bottom: insets.bottom + 14 }}>
      <View
        style={{
          height: 68,
          borderRadius: 34,
          backgroundColor: t.tab,
          borderWidth: 1,
          borderColor: t.line,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          shadowColor: "#000",
          shadowOpacity: 0.22,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        {side("history")}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={current === "index" ? "Identify what’s on screen" : "Scan"}
          onPress={() => {
            haptics.press();
            if (current === "index" && triggerScan()) return;
            navigation.navigate("index");
          }}
          style={({ pressed }) => ({ marginTop: -34, transform: [{ scale: pressed ? 0.94 : 1 }] })}
        >
          <View style={{ padding: 6, borderRadius: 40, backgroundColor: t.bg }}>
            <Gradient style={{ width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="scan" size={30} color="#fff" />
            </Gradient>
          </View>
        </Pressable>
        {side("account")}
      </View>
    </View>
  );
}
