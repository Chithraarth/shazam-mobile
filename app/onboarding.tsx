import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useSavePreferences } from "@/hooks/useProfile";

const COUNTRIES = [
  "India", "United States", "United Kingdom", "South Korea", "Japan", "China",
  "Canada", "Australia", "Germany", "France", "Spain", "Italy", "Brazil",
  "Mexico", "Argentina", "Turkey", "Russia", "Indonesia", "Pakistan",
  "Bangladesh", "Nigeria", "Egypt", "South Africa", "Kenya", "Saudi Arabia",
  "United Arab Emirates", "Israel", "Thailand", "Vietnam", "Philippines",
  "Malaysia", "Singapore", "Netherlands", "Belgium", "Sweden", "Norway",
  "Denmark", "Finland", "Poland", "Ukraine", "Greece", "Portugal", "Ireland",
  "Switzerland", "Austria", "Czech Republic", "Romania", "Hungary",
  "New Zealand", "Chile", "Colombia", "Peru", "Venezuela", "Sri Lanka",
  "Nepal", "Myanmar", "Taiwan", "Hong Kong", "Iran", "Iraq", "Morocco",
];

const LANGUAGES = [
  "English", "Hindi", "Korean", "Japanese", "Mandarin", "Spanish", "French",
  "German", "Tamil", "Telugu", "Malayalam", "Kannada", "Bengali", "Marathi",
  "Punjabi", "Urdu", "Arabic", "Turkish", "Portuguese", "Italian", "Russian",
  "Thai", "Vietnamese", "Indonesian", "Filipino", "Dutch", "Polish", "Swedish",
];

const REGIONS = [
  { key: "Bollywood (India)", icon: "🇮🇳" },
  { key: "Hollywood (US)", icon: "🇺🇸" },
  { key: "UK / British", icon: "🇬🇧" },
  { key: "Korean (K-Drama)", icon: "🇰🇷" },
  { key: "Japanese / Anime", icon: "🇯🇵" },
  { key: "Chinese (C-Drama)", icon: "🇨🇳" },
  { key: "South Indian", icon: "🎬" },
  { key: "Turkish Dramas", icon: "🇹🇷" },
  { key: "Spanish / Latin American", icon: "🌎" },
  { key: "European Cinema", icon: "🇪🇺" },
  { key: "Nollywood (Nigeria)", icon: "🇳🇬" },
  { key: "Middle Eastern / Arabic", icon: "🌙" },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const savePrefs = useSavePreferences();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [countrySearch, setCountrySearch] = useState("");
  const [country, setCountry] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);
  const [regions, setRegions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.toLowerCase().includes(q));
  }, [countrySearch]);

  if (!isSignedIn) return <Redirect href="/sign-in" />;

  const topPad = (Platform.OS === "web" ? 67 : insets.top) + 24;

  const toggleRegion = (key: string) => {
    Haptics.selectionAsync();
    setRegions((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  };

  const handleFinish = async () => {
    if (!country || !language || regions.length === 0) return;
    setError(null);
    try {
      await savePrefs.mutateAsync({ country, language, contentRegions: regions });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save. Please try again.");
    }
  };

  const stepTitle =
    step === 1 ? "Where are you from?" : step === 2 ? "Your preferred language?" : "What do you watch?";
  const stepSub =
    step === 1
      ? "We use your country to find local shows and platforms faster"
      : step === 2
      ? "The AI will prioritize content in your language"
      : "Pick one or more — this makes matches much more accurate";

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(136,77,255,0.12)", colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.progressRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[
                styles.progressDot,
                {
                  backgroundColor: s <= step ? colors.primary : "rgba(136,77,255,0.2)",
                  flex: s === step ? 2.5 : 1,
                },
              ]}
            />
          ))}
        </View>
        <Text style={[styles.title, { color: colors.foreground }]}>{stepTitle}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{stepSub}</Text>
      </View>

      {step === 1 && (
        <>
          <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search your country..."
              placeholderTextColor={colors.mutedForeground}
            />
          </View>
          <ScrollView contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled">
            {filteredCountries.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  Haptics.selectionAsync();
                  setCountry(c);
                }}
                style={[
                  styles.listItem,
                  {
                    backgroundColor: country === c ? "rgba(136,77,255,0.15)" : colors.card,
                    borderColor: country === c ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.listItemText, { color: colors.foreground }]}>{c}</Text>
                {country === c && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </>
      )}

      {step === 2 && (
        <ScrollView contentContainerStyle={[styles.listContent, styles.chipWrap]}>
          {LANGUAGES.map((l) => (
            <Pressable
              key={l}
              onPress={() => {
                Haptics.selectionAsync();
                setLanguage(l);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: language === l ? "rgba(136,77,255,0.2)" : colors.card,
                  borderColor: language === l ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: language === l ? colors.primary : colors.foreground }]}>
                {l}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {step === 3 && (
        <ScrollView contentContainerStyle={styles.listContent}>
          {REGIONS.map(({ key, icon }) => {
            const selected = regions.includes(key);
            return (
              <Pressable
                key={key}
                onPress={() => toggleRegion(key)}
                style={[
                  styles.listItem,
                  {
                    backgroundColor: selected ? "rgba(136,77,255,0.15)" : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={styles.regionIcon}>{icon}</Text>
                <Text style={[styles.listItemText, { color: colors.foreground, flex: 1 }]}>{key}</Text>
                {selected && <Ionicons name="checkmark-circle" size={20} color={colors.primary} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: (Platform.OS === "web" ? 34 : insets.bottom) + 16 }]}>
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.footerRow}>
          {step > 1 && (
            <Pressable
              onPress={() => setStep((s) => (s - 1) as 1 | 2)}
              style={[styles.backBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="arrow-back" size={20} color={colors.foreground} />
            </Pressable>
          )}
          <Pressable
            style={{ flex: 1 }}
            disabled={
              (step === 1 && !country) ||
              (step === 2 && !language) ||
              (step === 3 && (regions.length === 0 || savePrefs.isPending))
            }
            onPress={() => {
              if (step < 3) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setStep((s) => (s + 1) as 2 | 3);
              } else {
                handleFinish();
              }
            }}
          >
            <LinearGradient
              colors={["#884dff", "#7c3aed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.nextBtn,
                ((step === 1 && !country) ||
                  (step === 2 && !language) ||
                  (step === 3 && regions.length === 0)) && { opacity: 0.5 },
              ]}
            >
              {savePrefs.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextBtnText}>{step === 3 ? "Finish" : "Continue"}</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { paddingHorizontal: 24, gap: 10, paddingBottom: 16 },
  progressRow: { flexDirection: "row", gap: 6, marginBottom: 14 },
  progressDot: { height: 4, borderRadius: 2 },
  title: { fontSize: 26, fontWeight: "800" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "web" ? 12 : 10,
  },
  searchInput: { flex: 1, fontSize: 16 },
  listContent: { paddingHorizontal: 24, paddingVertical: 12, gap: 10 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listItemText: { fontSize: 16, fontWeight: "500" },
  regionIcon: { fontSize: 20 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  chipText: { fontSize: 15, fontWeight: "600" },
  footer: { paddingHorizontal: 24, paddingTop: 12, gap: 10 },
  footerRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  backBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  error: { color: "#f87171", fontSize: 13, textAlign: "center" },
});
