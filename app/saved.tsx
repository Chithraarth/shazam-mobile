import { useRouter } from "expo-router";
import React from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useHistory } from "@/lib/history-store";
import { openWatch } from "@/lib/links";
import { posterFor, TYPE_LABELS } from "@/lib/scan-types";
import { Button, Card, Chip, Divider, HeroIcon, Poster, Screen, Sticker, TopBar, Txt } from "@/ui/components";
import { fonts } from "@/ui/theme";

export default function Saved() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { items, toggleSaved } = useHistory();
  const saved = items.filter((i) => i.saved && i.result.found);
  const [hero, ...rest] = saved;

  return (
    <Screen scroll>
      <TopBar title="Saved" right={<Chip label={`${saved.length}`} small />} />
      {!hero ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <HeroIcon icon="bookmark-outline" variant="soft" />
          <Txt variant="title" size={24} center>Nothing saved yet</Txt>
          <Txt center>Tap Save on any result to keep it here for later.</Txt>
          <Button title="Scan something" onPress={() => router.navigate("/")} style={{ alignSelf: "stretch" }} />
        </View>
      ) : (
        <>
          <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: "/result", params: { id: hero.id } })}>
            <Poster uri={posterFor(hero.result, hero.thumbUri)} seed={hero.result.title ?? hero.id} style={{ height: width * 0.9, borderRadius: 28 }}>
              {hero.result.platform ? <Sticker label={hero.result.platform.toUpperCase()} size={11} style={{ position: "absolute", left: 14, top: 14 }} /> : null}
              <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 18, paddingTop: 40, backgroundColor: "rgba(0,0,0,0.4)", gap: 2 }}>
                <Text style={{ fontFamily: fonts.display[700], fontSize: 22, color: "#fff" }}>{hero.result.title}</Text>
                <Text style={{ fontFamily: fonts.body[600], fontSize: 13, color: "rgba(255,255,255,0.85)" }}>
                  {[hero.result.type ? TYPE_LABELS[hero.result.type] : null, hero.result.year].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </Poster>
          </Pressable>
          {hero.result.platform ? <Button title={`Watch on ${hero.result.platform}`} icon="play" onPress={() => openWatch(hero.result.platform!, hero.result.title ?? "")} /> : null}
          {rest.length ? (
            <Card>
              {rest.map((i, idx) => (
                <View key={i.id}>
                  {idx > 0 ? <Divider /> : null}
                  <Pressable onPress={() => router.push({ pathname: "/result", params: { id: i.id } })} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 12 }}>
                    <Poster uri={posterFor(i.result, i.thumbUri)} seed={i.result.title ?? i.id} style={{ width: 48, height: 68, borderRadius: 12 }} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Txt variant="strong" numberOfLines={1}>{i.result.title}</Txt>
                      <Txt variant="caption">{[i.result.platform, i.result.year].filter(Boolean).join(" · ")}</Txt>
                    </View>
                    <Chip label="Remove" small onPress={() => toggleSaved(i.id)} />
                  </Pressable>
                </View>
              ))}
            </Card>
          ) : null}
        </>
      )}
    </Screen>
  );
}
