import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHistory } from "@/lib/history-store";
import { openWatch, openWebSearch } from "@/lib/links";
import { Button, Card, Chip, Poster, Sticker, TopBar, Txt } from "@/ui/components";
import { useTheme } from "@/ui/theme";

export default function EpisodeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useHistory();
  const item = items.find((i) => i.id === id);
  const result = item?.result;
  if (!item || !result) return <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 12, paddingHorizontal: 20 }}><TopBar /></View>;

  const show = result.title ?? "This show";
  const ep = result.episode ?? {};
  const label = [ep.season != null ? `S${ep.season}` : null, ep.episode != null ? `E${ep.episode}` : null].filter(Boolean).join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ height: 250 }}>
          <Poster uri={item.thumbUri} seed={show} style={{ flex: 1, borderRadius: 0 }} />
          <LinearGradient colors={["transparent", t.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 110 }} />
          <View style={{ position: "absolute", left: 18, right: 18, top: insets.top + 12 }}><TopBar /></View>
          <Sticker label={`${result.confidence}% MATCH`} style={{ position: "absolute", right: 20, bottom: 26 }} />
        </View>
        <View style={{ paddingHorizontal: 20, gap: 14 }}>
          <Txt variant="overline">{show}{result.platform ? ` · ${result.platform}` : ""}</Txt>
          <Txt variant="title" size={26}>
            {label}{ep.episodeTitle ? " " : ""}
            {ep.episodeTitle ? <Txt variant="title" size={26} color="accent">{ep.episodeTitle}</Txt> : null}
          </Txt>
          {result.synopsis ? <Txt>{result.synopsis}</Txt> : null}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ep.season != null ? <Chip label={`Season ${ep.season}`} selected /> : null}
            {ep.episode != null ? <Chip label={`Episode ${ep.episode}`} tone="ok" /> : null}
          </View>
          <Card padded style={{ gap: 10 }}>
            <Txt variant="strong">Want the full episode list?</Txt>
            <Txt variant="caption">See every season and episode of {show}.</Txt>
            <Button title="Browse episodes" variant="secondary" height={48} onPress={() => openWebSearch(`${show} season ${ep.season ?? ""} episodes`)} />
          </Card>
          {result.platform ? <Button title={`Watch on ${result.platform}`} icon="play" onPress={() => openWatch(result.platform!, show)} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
