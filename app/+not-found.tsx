import { useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";
import { Button, HeroIcon, Screen, Txt } from "@/ui/components";

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <HeroIcon icon="compass-outline" variant="soft" />
        <Txt variant="title" center>Nothing here</Txt>
        <Txt center>That page doesn’t exist.</Txt>
      </View>
      <Button title="Back to scanning" onPress={() => router.replace("/")} />
    </Screen>
  );
}
