import * as Haptics from "expo-haptics";
import React, { createContext, ReactNode, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { useSettings } from "@/lib/settings";

// Pulse design tokens. The signature gradient and lime "match" accent are the
// same in both schemes; surfaces and text flip.
export const GRADIENT = ["#6A2BFF", "#E0147A", "#F0600A"] as const;
export const GRADIENT_START = { x: 0, y: 0 };
export const GRADIENT_END = { x: 1, y: 1 };

const shared = {
  lime: "#C6FF3D",
  onLime: "#17210A",
  pink: "#E0147A",
  white: "#FFFFFF",
};

const dark = {
  ...shared,
  scheme: "dark" as "dark" | "light",
  bg: "#0D0B14",
  surface: "#17131F",
  surface2: "#241D31",
  line: "#322A45",
  ink: "#FFFFFF",
  muted: "#B1A7C6",
  accent: "#FF5CAD",
  tab: "#1B1624",
  scrim: "rgba(6,4,12,0.62)",
  danger: "#FF6B6B",
};

const light: typeof dark = {
  ...shared,
  scheme: "light",
  bg: "#FFF8F4",
  surface: "#FFFFFF",
  surface2: "#F4ECF8",
  line: "#EADCF0",
  ink: "#16111F",
  muted: "#62576F",
  accent: "#C0106D",
  tab: "#FFFFFF",
  scrim: "rgba(22,17,31,0.45)",
  danger: "#C62828",
};

export type Theme = typeof dark & { isDark: boolean };

// Each weight is its own font family on React Native, so weights are picked
// by family name rather than fontWeight (which Android ignores for custom fonts).
export const fonts = {
  display: {
    500: "Unbounded_500Medium",
    700: "Unbounded_700Bold",
    800: "Unbounded_800ExtraBold",
  },
  body: {
    400: "PlusJakartaSans_400Regular",
    500: "PlusJakartaSans_500Medium",
    600: "PlusJakartaSans_600SemiBold",
    700: "PlusJakartaSans_700Bold",
    800: "PlusJakartaSans_800ExtraBold",
  },
} as const;

export const radius = { sm: 14, md: 20, lg: 24, xl: 32, pill: 999 };

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const { settings } = useSettings();
  const isDark = settings.theme === "system" ? system !== "light" : settings.theme === "dark";
  const theme = useMemo<Theme>(() => ({ ...(isDark ? dark : light), isDark }), [isDark]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

// Haptics that respect the user's setting.
export function useHaptics() {
  const { settings } = useSettings();
  return useMemo(() => {
    const on = settings.haptics;
    return {
      tap: () => { if (on) Haptics.selectionAsync().catch(() => {}); },
      press: () => { if (on) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
      success: () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
      warning: () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
      error: () => { if (on) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}); },
    };
  }, [settings.haptics]);
}
