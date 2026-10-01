import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSeason } from "@/lib/api";
import { useHistory } from "@/lib/history-store";
import { openWatch, openWebSearch } from "@/lib/links";
import { Button, Card, Chip, Divider, Poster, Skeleton, Sticker, TopBar, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

export default function EpisodeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useHistory();
  const item = items.find((i) => i.id === id);
  const result = item?.result;
  const cat = result?.catalog?.mediaType === "tv" ? result.catalog : null;
  const ep = result?.episode ?? {};
  const [season, setSeason] = useState<number>(ep.season ?? 1);
  const [open, setOpen] = useState<number | null>(ep.season === season ? ep.episode ?? null : null);
  const { data, isLoading, isError } = useSeason(cat?.tmdbId, cat ? season : null);

  if (!item || !result) return <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 12, paddingHorizontal: 20 }}><TopBar /></View>;

  const show = result.title ?? "This show";
  const label = [ep.season != null ? `S${ep.season}` : null, ep.episode != null ? `E${ep.episode}` : null].filter(Boolean).join(" · ");
  const seasons = cat?.seasons ? Array.from({ length: cat.seasons }, (_, i) => i + 1) : [];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}>
        <View style={{ height: 250 }}>
          <Poster uri={cat?.backdropUrl ?? item.thumbUri} seed={show} style={{ flex: 1, borderRadius: 0 }} />
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

          {cat && seasons.length ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {seasons.map((n) => <Chip key={n} label={`Season ${n}`} selected={n === season} onPress={() => { setSeason(n); setOpen(null); }} />)}
              </ScrollView>
              {isLoading ? (
                <View style={{ gap: 8 }}>{[0, 1, 2, 3].map((i) => <Skeleton key={i} height={52} radius={16} />)}</View>
              ) : isError || !data ? (
                <Txt>Couldn’t load the episodes right now.</Txt>
              ) : (
                <Card>
                  {data.episodes.map((e, i) => {
                    const here = season === ep.season && e.number === ep.episode;
                    const expanded = open === e.number;
                    return (
                      <View key={e.number}>
                        {i > 0 ? <Divider /> : null}
                        <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setOpen(expanded ? null : e.number)} style={{ padding: 14, gap: 8 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <Txt variant="h3" size={14} color={here ? "accent" : "muted"} style={{ width: 34 }}>E{e.number}</Txt>
                            <Txt variant="strong" style={{ flex: 1, fontFamily: here ? fonts.body[800] : fonts.body[600] }} numberOfLines={expanded ? undefined : 1}>{e.name}</Txt>
                            {here ? <Chip label="You’re here" tone="ok" small /> : e.runtime ? <Txt variant="caption">{e.runtime}m</Txt> : null}
                          </View>
                          {expanded ? (
                            <>
                              {e.stillUrl ? <Poster uri={e.stillUrl} seed={e.name} style={{ height: 170 }} /> : null}
                              {e.overview ? <Txt>{e.overview}</Txt> : null}
                              {e.airDate ? <Txt variant="caption">Aired {new Date(e.airDate).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</Txt> : null}
                            </>
                          ) : null}
                        </Pressable>
                      </View>
                    );
                  })}
                </Card>
              )}
            </>
          ) : (
            <Card padded style={{ gap: 10 }}>
              <Txt variant="strong">Want the full episode list?</Txt>
              <Txt variant="caption">See every season and episode of {show}.</Txt>
              <Button title="Browse episodes" variant="secondary" height={48} onPress={() => openWebSearch(`${show} season ${ep.season ?? ""} episodes`)} />
            </Card>
          )}
          {result.platform ? <Button title={`Watch on ${result.platform}`} icon="play" onPress={() => openWatch(result.platform!, show)} /> : null}
        </View>
      </ScrollView>
    </View>
  );
}
