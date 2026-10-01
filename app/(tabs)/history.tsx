import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/hooks/useProfile";
import { HistoryItem, useHistory } from "@/lib/history-store";
import { kindOf, ScanKind } from "@/lib/scan-types";
import { Button, Card, Checkbox, Chip, Dialog, Gradient, IconButton, Poster, SearchField, Skeleton, Sticker, TextLink, Toast, Txt } from "@/ui/components";
import { fonts, useHaptics, useTheme } from "@/ui/theme";

type Filter = "all" | ScanKind;
const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "show", label: "Shows" },
  { value: "clip", label: "Reels & clips" },
];
const GAP = 6;

function Stat({ value, label, accent }: { value: string | number; label: string; accent?: boolean }) {
  const t = useTheme();
  return (
    <Card padded style={{ flex: 1, paddingVertical: 12, gap: 0 }}>
      <Text style={{ fontFamily: fonts.display[700], fontSize: 22, color: accent ? t.accent : t.ink }}>{value}</Text>
      <Txt variant="caption" style={{ fontFamily: fonts.body[700], fontSize: 12 }}>{label}</Txt>
    </Card>
  );
}

export default function HistoryScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();
  const { width } = useWindowDimensions();
  const { items, loaded, remove, restore, clear } = useHistory();
  const { data: profile } = useProfile();
  const [filter, setFilter] = useState<Filter>("all");
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [undo, setUndo] = useState<HistoryItem[] | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(timer);
  }, [undo]);

  const tile = (width - 40 - GAP * 2) / 3;
  const found = items.filter((i) => i.result.found).length;
  const rate = items.length ? Math.round((found / items.length) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && (!i.result.found || kindOf(i.result.type) !== filter)) return false;
      if (!q) return true;
      const r = i.result;
      return [r.title, r.creator, r.creatorHandle, r.platform, ...(r.cast ?? []).map((c) => c.name)]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q));
    });
  }, [items, filter, query]);

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const deleteSelected = () => {
    if (!selected.length) return;
    haptics.warning();
    setUndo(remove(selected));
    setSelected([]);
    setSelecting(false);
  };

  const header = (
    <View style={{ gap: 14, paddingBottom: 14 }}>
      {selecting ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
          <TextLink title="Cancel" onPress={() => { setSelecting(false); setSelected([]); }} style={{ paddingVertical: 0 }} />
          <Txt variant="strong">{selected.length} selected</Txt>
          <TextLink title="Delete" color={t.danger} onPress={deleteSelected} style={{ paddingVertical: 0, opacity: selected.length ? 1 : 0.4 }} />
        </View>
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 }}>
          <Txt variant="title">Your scans</Txt>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <IconButton icon={searching ? "close" : "search"} label={searching ? "Close search" : "Search"} onPress={() => { setSearching((s) => !s); setQuery(""); }} />
            {items.length ? <IconButton icon="checkmark-done" label="Select scans" onPress={() => setSelecting(true)} /> : null}
          </View>
        </View>
      )}
      {searching && !selecting ? <SearchField value={query} onChangeText={setQuery} placeholder="Title, actor, creator or app" autoFocus /> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Stat value={items.length} label="scans" />
        <Stat value={`${rate}%`} label="found" accent />
        <Stat value={profile?.scansRemaining ?? "–"} label="left" />
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {FILTERS.map((f) => <Chip key={f.value} label={f.label} selected={filter === f.value} onPress={() => setFilter(f.value)} />)}
      </View>
      {selecting ? <TextLink title="Clear all history" color={t.danger} onPress={() => setConfirmClear(true)} style={{ textAlign: "left", paddingVertical: 0 }} /> : null}
    </View>
  );

  const renderItem = ({ item }: { item: HistoryItem }) => {
    const r = item.result;
    const isSel = selected.includes(item.id);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={r.found ? r.title ?? "Scan" : "No match"}
        onLongPress={() => { haptics.press(); setSelecting(true); toggle(item.id); }}
        onPress={() => (selecting ? toggle(item.id) : router.push({ pathname: "/result", params: { id: item.id } }))}
        style={{ width: tile, height: tile * 1.5 }}
      >
        {r.found ? (
          <Poster uri={item.thumbUri} seed={r.title ?? item.id} style={{ flex: 1, borderRadius: 14, borderWidth: isSel ? 3 : 0, borderColor: t.pink, opacity: selecting && !isSel ? 0.6 : 1 }}>
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: 8, paddingTop: 24, backgroundColor: "rgba(0,0,0,0.35)" }}>
              <Text numberOfLines={1} style={{ fontFamily: fonts.body[800], fontSize: 11, color: "#fff" }}>{r.title ?? r.creator ?? ""}</Text>
            </View>
            <Sticker label={`${r.confidence}%`} size={10} rotate={-4} style={{ position: "absolute", left: 6, top: 8 }} />
            {kindOf(r.type) === "clip" ? (
              <View style={{ position: "absolute", right: 6, top: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="play" size={11} color="#fff" />
              </View>
            ) : null}
          </Poster>
        ) : (
          <View style={{ flex: 1, borderRadius: 14, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center", gap: 4, borderWidth: isSel ? 3 : 0, borderColor: t.pink }}>
            <Text style={{ fontFamily: fonts.display[700], fontSize: 28, color: t.muted }}>?</Text>
            <Txt variant="caption" style={{ fontSize: 11 }}>No match</Txt>
          </View>
        )}
        {selecting ? <View style={{ position: "absolute", right: 8, top: 8 }}><Checkbox checked={isSel} /></View> : null}
      </Pressable>
    );
  };

  const empty = !loaded ? (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
      {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} width={tile} height={tile * 1.5} radius={14} />)}
    </View>
  ) : items.length === 0 ? (
    <View style={{ alignItems: "center", gap: 16, paddingTop: 40 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, width: 210, transform: [{ rotate: "-6deg" }] }}>
        {Array.from({ length: 6 }, (_, i) =>
          i === 1 ? <Gradient key={i} style={{ width: 66, height: 88, borderRadius: 14, opacity: 0.85 }} /> : <View key={i} style={{ width: 66, height: 88, borderRadius: 14, backgroundColor: t.surface2 }} />,
        )}
      </View>
      <Txt variant="title" size={24} center>
        Your grid is <Txt variant="title" size={24} color="accent">empty</Txt>
      </Txt>
      <Txt center style={{ maxWidth: 270 }}>Scan something and it’ll show up here, ready to find again.</Txt>
      <Button title="Scan something" onPress={() => router.navigate("/")} style={{ width: 220 }} />
    </View>
  ) : (
    <Txt center style={{ paddingTop: 30 }}>Nothing matches that.</Txt>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <FlatList
        data={loaded ? visible : []}
        keyExtractor={(i) => i.id}
        renderItem={renderItem}
        numColumns={3}
        columnWrapperStyle={{ gap: GAP }}
        ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      />
      {undo ? (
        <Toast
          message={`${undo.length} scan${undo.length === 1 ? "" : "s"} deleted`}
          actionLabel="Undo"
          onAction={() => { restore(undo); setUndo(null); }}
          bottom={insets.bottom + 100}
        />
      ) : null}
      <Dialog
        visible={confirmClear}
        title="Clear all history?"
        message={`This removes all ${items.length} scans from this phone. It can’t be undone.`}
        primary={{ title: "Clear all", variant: "danger", onPress: async () => { setConfirmClear(false); setSelecting(false); setSelected([]); await clear(); } }}
        secondary={{ title: "Cancel", onPress: () => setConfirmClear(false) }}
        onClose={() => setConfirmClear(false)}
      />
    </View>
  );
}
