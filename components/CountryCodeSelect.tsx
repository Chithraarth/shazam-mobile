import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { countries, countryFlag, findCountry, type Country } from "@/lib/countries";

export function CountryCodeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso2: string) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findCountry(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso2.toLowerCase().includes(q),
    );
  }, [query]);

  const renderItem = ({ item }: { item: Country }) => (
    <Pressable
      onPress={() => {
        onChange(item.iso2);
        setOpen(false);
        setQuery("");
      }}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.flag}>{countryFlag(item.iso2)}</Text>
      <Text style={[styles.rowName, { color: colors.foreground }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={{ color: colors.mutedForeground }}>+{item.dialCode}</Text>
    </Pressable>
  );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.trigger, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={styles.flag}>{selected ? countryFlag(selected.iso2) : "🌐"}</Text>
        <Text style={{ color: colors.foreground }}>{selected ? `+${selected.dialCode}` : "Code"}</Text>
        <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top + 16 }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select country</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search country or code..."
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.search,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
            ]}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.iso2}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          />
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  flag: { fontSize: 18 },
  modal: { flex: 1, paddingHorizontal: 20 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  search: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  rowName: { flex: 1, fontSize: 15 },
});
