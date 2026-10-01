import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Gradient } from "./components";

// Shown while fonts, settings and the signed-in user load. Uses system fonts
// on purpose: it can render before the custom fonts are ready.
export function Splash({ busy }: { busy?: boolean }) {
  return (
    <Gradient style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
      <View
        style={{
          width: 112,
          height: 112,
          borderRadius: 36,
          backgroundColor: "#fff",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
        }}
      >
        <Ionicons name="scan" size={54} color="#C0106D" />
      </View>
      <Text style={{ color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -1 }}>videofy</Text>
      <View style={{ position: "absolute", bottom: 64, alignItems: "center", gap: 14 }}>
        {busy ? <ActivityIndicator color="#fff" /> : null}
        <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "700" }}>what’s that clip?</Text>
      </View>
    </Gradient>
  );
}
