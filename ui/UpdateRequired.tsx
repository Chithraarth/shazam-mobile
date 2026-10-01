import { Ionicons } from "@expo/vector-icons";
import * as Application from "expo-application";
import React from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { openStoreListing } from "@/lib/links";
import { Button, Gradient } from "./components";
import { fonts } from "./theme";

export function UpdateRequired() {
  const insets = useSafeAreaInsets();
  return (
    <Gradient style={{ flex: 1, paddingHorizontal: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 18 }}>
        <View style={{ width: 104, height: 104, borderRadius: 34, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="arrow-down" size={46} color="#C0106D" />
        </View>
        <Text style={{ fontFamily: fonts.display[800], fontSize: 32, lineHeight: 36, color: "#fff", textAlign: "center" }}>
          New version{"\n"}just dropped
        </Text>
        <Text style={{ fontFamily: fonts.body[600], fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.92)", textAlign: "center" }}>
          Update to keep scanning. Your scans and history are safe.
        </Text>
        <View style={{ paddingHorizontal: 14, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.25)", justifyContent: "center" }}>
          <Text style={{ fontFamily: fonts.body[800], fontSize: 13, color: "#fff" }}>You have {Application.nativeApplicationVersion ?? "an older version"}</Text>
        </View>
      </View>
      <Button title="Update now" variant="white" onPress={openStoreListing} />
    </Gradient>
  );
}
