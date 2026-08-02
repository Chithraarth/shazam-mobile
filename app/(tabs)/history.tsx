import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useUser } from "@clerk/expo";
import { useColors } from "@/hooks/useColors";

export function historyKeyFor(userId: string | null | undefined) {
  return `@shazam_history:${userId ?? "anon"}`;
}

export interface LocalHistoryItem {
  id: string;
  createdAt: string;
  found: boolean;
  confidence: number;
  title: string | null;
  type: string | null;
  platform: string | null;
  thumbnailData?: string | null;
  resultData: string;
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence >= 80 ? "#22c55e" : confidence >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <View style={{ alignItems: "center", gap: 2 }}>
      <Text style={{ fontSize: 15, fontWeight: "700", color }}>{confidence}%</Text>
      <Text style={{ fontSize: 10, color, letterSpacing: 0.5 }}>
        {confidence >= 80 ? "HIGH" : confidence >= 60 ? "MED" : "LOW"}
      </Text>
    </View>
  );
}

function HistoryRow({ item, onDelete }: { item: LocalHistoryItem; onDelete: () => void }) {
  const colors = useColors();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/result", params: { resultData: item.resultData } })}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.thumb,
          { backgroundColor: colors.muted, borderRadius: 10 },
        ]}
      >
        {item.found ? (
          <Ionicons name="film-outline" size={22} color={colors.primary} />
        ) : (
          <Ionicons name="help-circle-outline" size={22} color={colors.mutedForeground} />
        )}
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={1}>
          {item.title ?? "Unknown"}
        </Text>
        <Text style={[styles.rowMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
          {[item.type, item.platform].filter(Boolean).join(" · ") || "Not identified"}
        </Text>
        <Text style={[styles.rowDate, { color: colors.mutedForeground }]}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <ConfidenceDot confidence={item.confidence} />
        <Pressable
          onPress={() => {
            Alert.alert("Delete", "Remove this scan from history?", [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: onDelete },
            ]);
          }}
          hitSlop={12}
          style={styles.deleteBtn}
        >
          <Ionicons name="trash-outline" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function StatsBar({ total, found }: { total: number; found: number }) {
  const colors = useColors();
  const rate = total > 0 ? Math.round((found / total) * 100) : 0;
  return (
    <View style={styles.statsRow}>
      {[
        { label: "Total Scans", value: String(total) },
        { label: "Identified", value: String(found) },
        { label: "Success Rate", value: `${rate}%` },
      ].map(({ label, value }) => (
        <View
          key={label}
          style={[
            styles.statCard,
            {
              backgroundColor: "rgba(136,77,255,0.05)",
              borderColor: "rgba(136,77,255,0.2)",
            },
          ]}
        >
          <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const historyKey = historyKeyFor(user?.id);
  const [history, setHistory] = useState<LocalHistoryItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(historyKey);
      const data: LocalHistoryItem[] = raw ? JSON.parse(raw) : [];
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }, [historyKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      const raw = await AsyncStorage.getItem(historyKey);
      const data: LocalHistoryItem[] = raw ? JSON.parse(raw) : [];
      const updated = data.filter((item) => item.id !== id);
      await AsyncStorage.setItem(historyKey, JSON.stringify(updated));
      setHistory(updated);
    } catch {
      /* ignore */
    }
  }, [historyKey]);

  const handleClearAll = useCallback(() => {
    Alert.alert("Clear History", "Delete all scan history?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem(historyKey);
          setHistory([]);
        },
      },
    ]);
  }, [historyKey]);

  const found = history.filter((h) => h.found).length;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 16,
            borderBottomColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>History</Text>
        {history.length > 0 && (
          <Pressable onPress={handleClearAll} hitSlop={12}>
            <Text style={[styles.clearBtn, { color: colors.mutedForeground }]}>Clear all</Text>
          </Pressable>
        )}
      </View>

      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 + 84 : 100 },
        ]}
        scrollEnabled={history.length > 0}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          history.length > 0 ? <StatsBar total={history.length} found={found} /> : null
        }
        renderItem={({ item }) => (
          <HistoryRow item={item} onDelete={() => handleDelete(item.id)} />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
              <Ionicons name="film-outline" size={40} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No scans yet</Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Scan a screen or upload a photo to identify movies and shows
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontWeight: "700" },
  clearBtn: { fontSize: 15 },
  list: { paddingHorizontal: 16, paddingTop: 12, gap: 10, flexGrow: 1 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    gap: 2,
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowContent: { flex: 1, gap: 3 },
  rowTitle: { fontSize: 15, fontWeight: "600" },
  rowMeta: { fontSize: 13 },
  rowDate: { fontSize: 12 },
  rowRight: { alignItems: "flex-end", gap: 8 },
  deleteBtn: { padding: 4 },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontWeight: "600" },
  emptyText: { fontSize: 15, textAlign: "center", lineHeight: 22 },
});
