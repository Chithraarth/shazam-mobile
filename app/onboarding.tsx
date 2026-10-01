import * as Localization from "expo-localization";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";
import { CountryPicker, detectedCountryName, FeedTiles, LanguageChips } from "@/components/VibePickers";
import { useSavePreferences } from "@/hooks/useProfile";
import { useAuth } from "@/lib/auth-context";
import { Button, IconButton, ProgressSteps, Screen, TextLink, Txt } from "@/ui/components";
import { useHaptics } from "@/ui/theme";

const STEPS = [
  { title: "Where do you ", accent: "watch from?", body: "So we show the right streaming apps and prices." },
  { title: "What do you ", accent: "watch in?", body: "Pick all that apply." },
  { title: "What’s in ", accent: "your feed?", body: "Helps us pick between look-alike titles." },
];

function deviceLanguage(): string {
  const code = Localization.getLocales()[0]?.languageCode;
  const map: Record<string, string> = { hi: "Hindi", ta: "Tamil", te: "Telugu", ml: "Malayalam", kn: "Kannada", bn: "Bengali", mr: "Marathi", pa: "Punjabi", ko: "Korean", ja: "Japanese", es: "Spanish" };
  return (code && map[code]) || "English";
}

// Setup steps E–G. Every step can be skipped; skipped answers fall back to
// the device's country and language so the backend still gets a valid profile.
export default function Onboarding() {
  const router = useRouter();
  const haptics = useHaptics();
  const { isSignedIn } = useAuth();
  const save = useSavePreferences();
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState<string | null>(detectedCountryName());
  const [languages, setLanguages] = useState<string[]>([]);
  const [feeds, setFeeds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (!isSignedIn) return <Redirect href="/sign-in" />;

  const finish = async () => {
    setError(null);
    try {
      await save.mutateAsync({
        country: country ?? detectedCountryName(),
        language: (languages.length ? languages : [deviceLanguage()]).join(", ").slice(0, 100),
        contentRegions: feeds.length ? feeds : ["Mixed"],
      });
      haptics.success();
      router.replace("/permissions");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save. Please try again.");
    }
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());
  const s = STEPS[step];
  const canContinue = step === 0 ? !!country : step === 1 ? languages.length > 0 : feeds.length > 0;

  return (
    <Screen scroll>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
        {step > 0 ? <IconButton icon="chevron-back" label="Back" onPress={() => setStep(step - 1)} /> : <View style={{ width: 44 }} />}
        <ProgressSteps total={STEPS.length} current={step + 1} />
        <TextLink title="Skip" onPress={next} style={{ paddingVertical: 0 }} />
      </View>
      <Txt variant="title">
        {s.title}<Txt variant="title" color="accent">{s.accent}</Txt>
      </Txt>
      <Txt style={{ marginTop: -6 }}>{s.body}</Txt>

      {step === 0 ? <CountryPicker value={country} onChange={setCountry} /> : null}
      {step === 1 ? <LanguageChips value={languages} onChange={setLanguages} /> : null}
      {step === 2 ? <FeedTiles value={feeds} onChange={setFeeds} /> : null}

      {error ? <Txt color="danger">{error}</Txt> : null}
      <View style={{ flex: 1 }} />
      <Button
        title={step === 1 && languages.length ? `Continue · ${languages.length} selected` : "Continue"}
        onPress={next}
        disabled={!canContinue}
        loading={save.isPending}
      />
    </Screen>
  );
}

