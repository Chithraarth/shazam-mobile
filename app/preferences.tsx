import { useRouter } from "expo-router";
import React, { useState } from "react";
import { CountryPicker, FeedTiles, LanguageChips, LANGUAGES } from "@/components/VibePickers";
import { useProfile, useSavePreferences } from "@/hooks/useProfile";
import { Button, Screen, TopBar, Txt } from "@/ui/components";
import { useHaptics } from "@/ui/theme";

// Screen 35: the onboarding answers, editable any time.
export default function Preferences() {
  const router = useRouter();
  const haptics = useHaptics();
  const { data: profile } = useProfile();
  const save = useSavePreferences();
  const known = LANGUAGES.map((l) => l.label);
  const [country, setCountry] = useState<string | null>(profile?.country ?? null);
  const [languages, setLanguages] = useState<string[]>(
    (profile?.language ?? "").split(",").map((s) => s.trim()).filter((s) => known.includes(s)),
  );
  const [feeds, setFeeds] = useState<string[]>((profile?.contentRegions ?? []).filter((f) => f !== "Mixed"));
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    try {
      await save.mutateAsync({
        country: country ?? "India",
        language: (languages.length ? languages : ["English"]).join(", "),
        contentRegions: feeds.length ? feeds : ["Mixed"],
      });
      haptics.success();
      router.back();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save. Please try again.");
    }
  };

  return (
    <Screen scroll>
      <TopBar title="Your vibe" />
      <Txt variant="overline">Country</Txt>
      <CountryPicker value={country} onChange={setCountry} />
      <Txt variant="overline">Languages</Txt>
      <LanguageChips value={languages} onChange={setLanguages} />
      <Txt variant="overline">Your feed</Txt>
      <FeedTiles value={feeds} onChange={setFeeds} />
      <Txt variant="caption">Only used to break ties between look-alike titles.</Txt>
      {error ? <Txt color="danger">{error}</Txt> : null}
      <Button title="Save changes" onPress={submit} loading={save.isPending} />
    </Screen>
  );
}
