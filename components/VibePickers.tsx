import { Ionicons } from "@expo/vector-icons";
import * as Localization from "expo-localization";
import React, { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { countries, countryFlag } from "@/lib/countries";
import { Card, Chip, Divider, Gradient, Radio, SearchField, Sticker } from "@/ui/components";
import { fonts, useHaptics, useTheme } from "@/ui/theme";

export const LANGUAGES = [
  { label: "Hindi", glyph: "हिं" },
  { label: "English", glyph: "Aa" },
  { label: "Tamil", glyph: "த" },
  { label: "Telugu", glyph: "తె" },
  { label: "Malayalam", glyph: "മ" },
  { label: "Kannada", glyph: "ಕ" },
  { label: "Bengali", glyph: "বা" },
  { label: "Marathi", glyph: "म" },
  { label: "Punjabi", glyph: "ਪ" },
  { label: "Korean", glyph: "한" },
  { label: "Japanese", glyph: "日" },
  { label: "Spanish", glyph: "Ñ" },
];

export const FEEDS = [
  "Bollywood",
  "South Indian",
  "Hollywood",
  "Reels & Shorts",
  "Web series",
  "K-drama",
  "Anime",
  "Documentaries",
];

const POPULAR = ["IN", "US", "GB", "AE", "CA", "SG", "AU", "SA"];

export function detectedCountryName(): string {
  const iso = Localization.getLocales()[0]?.regionCode ?? "IN";
  return countries.find((c) => c.iso2 === iso)?.name ?? "India";
}

export function CountryPicker({ value, onChange }: { value: string | null; onChange: (name: string) => void }) {
  const t = useTheme();
  const haptics = useHaptics();
  const [query, setQuery] = useState("");
  const detected = useMemo(detectedCountryName, []);
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return countries.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 30);
    const popular = POPULAR.map((iso) => countries.find((c) => c.iso2 === iso)).filter((c): c is (typeof countries)[number] => !!c);
    const det = countries.find((c) => c.name === detected);
    return det && !popular.includes(det) ? [det, ...popular] : popular;
  }, [query, detected]);

  return (
    <View style={{ gap: 14 }}>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search country" />
      <Card>
        {list.map((c, i) => (
          <View key={c.iso2}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: value === c.name }}
              onPress={() => { haptics.tap(); onChange(c.name); }}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}
            >
              <Text style={{ fontSize: 18 }}>{countryFlag(c.iso2)}</Text>
              <Text style={{ flex: 1, fontFamily: fonts.body[value === c.name ? 800 : 600], fontSize: 15, color: t.ink }}>{c.name}</Text>
              {c.name === detected ? <Sticker label="DETECTED" size={9} rotate={0} /> : null}
              <Radio selected={value === c.name} />
            </Pressable>
          </View>
        ))}
      </Card>
    </View>
  );
}

export function LanguageChips({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {LANGUAGES.map((l) => {
        const on = value.includes(l.label);
        return (
          <Chip
            key={l.label}
            label={l.label}
            leading={l.glyph}
            selected={on}
            onPress={() => onChange(on ? value.filter((v) => v !== l.label) : [...value, l.label])}
          />
        );
      })}
    </View>
  );
}

export function FeedTiles({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const t = useTheme();
  const haptics = useHaptics();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {FEEDS.map((f) => {
        const on = value.includes(f);
        const inner = (
          <>
            {on ? (
              <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="checkmark" size={15} color="#C0106D" />
              </View>
            ) : (
              <Text style={{ fontFamily: fonts.body[700], fontSize: 12, color: t.muted }}>Tap to add</Text>
            )}
            <Text style={{ fontFamily: fonts.display[700], fontSize: 15, color: on ? "#fff" : t.ink }}>{f}</Text>
          </>
        );
        const style = { height: 92, borderRadius: 24, padding: 14, justifyContent: "space-between" as const };
        return (
          <Pressable
            key={f}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={f}
            onPress={() => { haptics.tap(); onChange(on ? value.filter((v) => v !== f) : [...value, f]); }}
            style={{ width: "47%", flexGrow: 1 }}
          >
            {on ? <Gradient style={style}>{inner}</Gradient> : <View style={[style, { backgroundColor: t.surface2 }]}>{inner}</View>}
          </Pressable>
        );
      })}
    </View>
  );
}
