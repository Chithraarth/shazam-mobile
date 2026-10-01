import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { countries, countryFlag, findCountry, type Country } from "@/lib/countries";
import { IconButton, SearchField, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

export function CountryCodeSelect({ value, onChange }: { value: string; onChange: (iso2: string) => void }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = findCountry(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.iso2.toLowerCase().includes(q));
  }, [query]);

  const renderItem = ({ item }: { item: Country }) => (
    <Pressable
      onPress={() => { onChange(item.iso2); setOpen(false); setQuery(""); }}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={{ fontSize: 20 }}>{countryFlag(item.iso2)}</Text>
      <Text style={{ flex: 1, fontFamily: fonts.body[700], fontSize: 15, color: t.ink }} numberOfLines={1}>{item.name}</Text>
      <Text style={{ fontFamily: fonts.body[600], color: t.muted }}>+{item.dialCode}</Text>
    </Pressable>
  );

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Country code ${selected ? `+${selected.dialCode}` : ""}`}
        onPress={() => setOpen(true)}
        style={{ height: 58, borderRadius: 20, backgroundColor: t.surface2, flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14 }}
      >
        <Text style={{ fontSize: 18 }}>{selected ? countryFlag(selected.iso2) : "🌐"}</Text>
        <Text style={{ fontFamily: fonts.body[800], fontSize: 16, color: t.ink }}>{selected ? `+${selected.dialCode}` : "Code"}</Text>
        <Ionicons name="chevron-down" size={14} color={t.muted} />
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 12, paddingHorizontal: 20, gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Txt variant="h3">Select country</Txt>
            <IconButton icon="close" label="Close" onPress={() => setOpen(false)} />
          </View>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search country or code" autoCapitalize="none" />
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
