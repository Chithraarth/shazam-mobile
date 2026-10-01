import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as StoreReview from "expo-store-review";
import React, { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProfile } from "@/hooks/useProfile";
import { usePerson } from "@/lib/api";
import { useHistory } from "@/lib/history-store";
import { emailSupport, openTrailer, openWatch, openWebSearch } from "@/lib/links";
import { confidenceLabel, IdentifyResult, Provider, TYPE_LABELS } from "@/lib/scan-types";
import { useSettings } from "@/lib/settings";
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  Divider,
  HeroIcon,
  IconButton,
  IconName,
  Poster,
  Radio,
  RingAvatar,
  Screen,
  Skeleton,
  Sticker,
  TextLink,
  Toast,
  TopBar,
  Txt,
} from "@/ui/components";
import { fonts, useHaptics, useTheme } from "@/ui/theme";

const RATE_AFTER_FOUND = 10;

function Action({ icon, label, onPress, active }: { icon: IconName; label: string; onPress: () => void; active?: boolean }) {
  return (
    <View style={{ alignItems: "center", gap: 6, width: 72 }}>
      <IconButton icon={icon} label={label} onPress={onPress} size={54} variant={active ? "grad" : "soft"} />
      <Txt variant="caption" color="ink" style={{ fontFamily: fonts.body[700], fontSize: 12 }}>{label}</Txt>
    </View>
  );
}

function NoMatch({ thumb }: { thumb?: string | null }) {
  const router = useRouter();
  const { data: profile } = useProfile();
  return (
    <Screen scroll>
      <TopBar left="close" onLeft={() => router.replace("/")} />
      <View style={{ alignItems: "center", gap: 14, marginTop: 10 }}>
        {thumb ? (
          <Image source={{ uri: thumb }} style={{ width: 120, height: 120, borderRadius: 32, opacity: 0.6 }} contentFit="cover" />
        ) : (
          <HeroIcon icon="help" variant="soft" rotate={-6} />
        )}
        <Txt variant="title" center>
          Hmm, couldn’t <Txt variant="title" color="accent">find it</Txt>
        </Txt>
        <Chip label={`${profile?.scansRemaining ?? 0} scans left`} small />
      </View>
      <Card>
        {[
          "Get a face or subtitles in the frame",
          "Fill the frame with the screen",
          "Avoid glare and reflections",
        ].map((tip, i) => (
          <View key={tip}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16 }}>
              <Txt variant="h3" color="accent" size={16}>{i + 1}</Txt>
              <Txt variant="strong" style={{ flex: 1 }}>{tip}</Txt>
            </View>
          </View>
        ))}
      </Card>
      <View style={{ flex: 1 }} />
      <Button title="Try again" onPress={() => router.replace("/")} />
      <TextLink title="Scan a screen recording instead" onPress={() => router.replace("/scan/recording-guide")} />
    </Screen>
  );
}

function WhichOne({ result, onPick, onNone }: { result: IdentifyResult; onPick: () => void; onNone: () => void }) {
  const [choice, setChoice] = useState<string>(result.title ?? "");
  const options = [result.title ?? "", ...(result.alternativeTitles ?? [])].filter(Boolean).slice(0, 4);
  return (
    <Screen scroll>
      <TopBar left="close" />
      <Txt variant="title">
        Which one <Txt variant="title" color="accent">is it?</Txt>
      </Txt>
      <Txt style={{ marginTop: -6 }}>These look alike. Tap the right one.</Txt>
      {options.map((title, i) => (
        <Pressable key={title} accessibilityRole="radio" accessibilityState={{ selected: choice === title }} onPress={() => setChoice(title)}>
          <Card padded style={{ flexDirection: "row", alignItems: "center", gap: 14, borderWidth: choice === title ? 2.5 : undefined, borderColor: choice === title ? "#E0147A" : undefined }}>
            <Poster seed={title} style={{ width: 56, height: 82, borderRadius: 14 }} />
            <View style={{ flex: 1, gap: 4 }}>
              <Txt variant="strong">{title}</Txt>
              <Txt variant="caption">{i === 0 ? `Best match · ${result.confidence}%` : "Also possible"}</Txt>
            </View>
            <Radio selected={choice === title} />
          </Card>
        </Pressable>
      ))}
      <View style={{ flex: 1 }} />
      <Button
        title={choice === result.title ? "Show details" : `Search “${choice}”`}
        onPress={() => (choice === result.title ? onPick() : openWebSearch(choice))}
      />
      <TextLink title="None of these" onPress={onNone} />
    </Screen>
  );
}

const REPORT_REASONS = ["Wrong title", "Right show, wrong episode", "Wrong cast or details", "Something else"];

function ReportSheet({ visible, onClose, result, onSent }: { visible: boolean; onClose: () => void; result: IdentifyResult; onSent: () => void }) {
  const t = useTheme();
  const [reason, setReason] = useState(REPORT_REASONS[0]);
  const [actual, setActual] = useState("");
  const send = () => {
    const body = [
      `Reason: ${reason}`,
      `We said: ${result.title ?? "(no match)"}${result.year ? ` (${result.year})` : ""} — ${result.confidence}%`,
      actual ? `It is actually: ${actual}` : "",
      result.historyId ? `Scan id: ${result.historyId}` : "",
    ].filter(Boolean).join("\n");
    emailSupport("Wrong result on Videofy", body);
    onClose();
    onSent();
  };
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Txt variant="title" size={24}>
        Not the right <Txt variant="title" size={24} color="accent">one?</Txt>
      </Txt>
      <Card>
        {REPORT_REASONS.map((r, i) => (
          <View key={r}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="radio" accessibilityState={{ selected: reason === r }} onPress={() => setReason(r)} style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: 15 }}>
              <Radio selected={reason === r} />
              <Txt variant="strong" style={{ flex: 1 }}>{r}</Txt>
            </Pressable>
          </View>
        ))}
      </Card>
      <Txt variant="caption" style={{ fontFamily: fonts.body[800] }}>What is it actually? (optional)</Txt>
      <TextInput
        value={actual}
        onChangeText={setActual}
        placeholder="Title, show or creator"
        placeholderTextColor={t.muted}
        style={{ height: 56, borderRadius: 20, backgroundColor: t.surface2, paddingHorizontal: 16, color: t.ink, fontFamily: fonts.body[700], fontSize: 16 }}
      />
      <Button title="Send feedback" onPress={send} />
    </BottomSheet>
  );
}

type Person = { name: string; character?: string | null; role?: string | null; id?: number; profileUrl?: string | null };

function CastSheet({ member, onClose }: { member: Person | null; onClose: () => void }) {
  const t = useTheme();
  const { data: person, isLoading } = usePerson(member?.id);
  return (
    <BottomSheet visible={!!member} onClose={onClose}>
      {member ? (
        <ScrollView contentContainerStyle={{ alignItems: "center", gap: 12 }} showsVerticalScrollIndicator={false}>
          <RingAvatar name={member.name} uri={person?.profileUrl ?? member.profileUrl} size={104} />
          <Txt variant="title" size={26} center>{member.name}</Txt>
          {member.character || member.role ? (
            <Chip label={[member.character ? `Plays ${member.character}` : null, member.role].filter(Boolean).join(" · ")} small />
          ) : null}
          {member.id ? (
            <View style={{ alignSelf: "stretch", gap: 10, marginTop: 6 }}>
              <Txt variant="overline">Also in</Txt>
              {isLoading ? (
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {[0, 1, 2].map((i) => <Skeleton key={i} width={104} height={150} radius={16} />)}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                  {(person?.knownFor ?? []).map((k) => (
                    <Pressable key={`${k.mediaType}${k.id}`} onPress={() => openWebSearch(`${k.title} ${k.year ?? ""}`)} style={{ width: 104, gap: 4 }}>
                      <Poster uri={k.posterUrl} seed={k.title} style={{ height: 150 }} />
                      <Text numberOfLines={2} style={{ fontFamily: fonts.body[800], fontSize: 12, color: t.ink }}>{k.title}</Text>
                      {k.year ? <Txt variant="caption" style={{ fontSize: 11 }}>{k.year}</Txt> : null}
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            </View>
          ) : null}
          <View style={{ alignSelf: "stretch", gap: 8, marginTop: 8 }}>
            <Button title={`More about ${member.name.split(" ")[0]}`} variant="secondary" onPress={() => openWebSearch(member.name)} />
          </View>
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

function ProviderRow({ label, providers, onPress }: { label: string; providers: Provider[]; onPress: (p: Provider) => void }) {
  const t = useTheme();
  if (!providers.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Txt variant="caption" style={{ fontFamily: fonts.body[800] }}>{label}</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {providers.map((p) => (
          <Pressable
            key={p.id}
            accessibilityRole="link"
            accessibilityLabel={`${label} on ${p.name}`}
            onPress={() => onPress(p)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 4, paddingRight: 14, height: 44, borderRadius: 22, backgroundColor: t.surface2, opacity: pressed ? 0.75 : 1 })}
          >
            {p.logoUrl ? <Image source={{ uri: p.logoUrl }} style={{ width: 36, height: 36, borderRadius: 18 }} /> : <View style={{ width: 8 }} />}
            <Text style={{ fontFamily: fonts.body[800], fontSize: 14, color: t.ink }}>{p.name}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function ResultScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const haptics = useHaptics();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const history = useHistory();
  const { settings, update } = useSettings();
  const item = history.items.find((i) => i.id === id);
  const result = item?.result;
  const [confirmed, setConfirmed] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [castOpen, setCastOpen] = useState<Person | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [rateOpen, setRateOpen] = useState(false);

  const foundCount = useMemo(() => history.items.filter((i) => i.result.found).length, [history.items]);

  useEffect(() => {
    if (!fresh || !result?.found || settings.ratePrompted || foundCount < RATE_AFTER_FOUND) return;
    const timer = setTimeout(() => setRateOpen(true), 1500);
    return () => clearTimeout(timer);
  }, [fresh, result?.found, settings.ratePrompted, foundCount]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!item || !result) {
    return (
      <Screen>
        <TopBar left="close" />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14 }}>
          <HeroIcon icon="alert-circle-outline" variant="soft" />
          <Txt variant="title" center>Result unavailable</Txt>
        </View>
      </Screen>
    );
  }

  if (!result.found) return <NoMatch thumb={item.thumbUri} />;

  const lowConfidence = result.confidence < 60 && (result.alternativeTitles?.length ?? 0) > 0;
  if (fresh && lowConfidence && !confirmed) {
    return (
      <>
        <WhichOne result={result} onPick={() => setConfirmed(true)} onNone={() => setReportOpen(true)} />
        <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} result={result} onSent={() => router.replace("/")} />
      </>
    );
  }

  const title = result.title ?? result.creator ?? "Untitled";
  const cat = result.catalog;
  const runtime = cat?.runtimeMinutes ? `${Math.floor(cat.runtimeMinutes / 60) ? `${Math.floor(cat.runtimeMinutes / 60)}h ` : ""}${cat.runtimeMinutes % 60}m` : null;
  const meta = [result.type ? TYPE_LABELS[result.type] ?? result.type : null, result.year ?? cat?.year, result.language, runtime, result.genre].filter(Boolean) as (string | number)[];
  const heroUri = cat?.backdropUrl ?? cat?.posterUrl ?? item.thumbUri;
  const cast: Person[] = cat?.cast.length
    ? cat.cast.map((c) => ({ id: c.id, name: c.name, character: c.character, profileUrl: c.profileUrl }))
    : result.cast ?? [];
  const watch = cat?.watch;
  const hasProviders = !!watch && watch.stream.length + watch.rent.length + watch.buy.length > 0;
  const openProvider = (p: Provider) => (watch?.link ? Linking.openURL(watch.link) : openWatch(p.name, title));
  const playTrailer = () => (cat?.trailerKey ? Linking.openURL(`https://www.youtube.com/watch?v=${cat.trailerKey}`) : openTrailer(title, result.year));
  const ep = result.episode;
  const hasEpisode = !!ep && (ep.season != null || ep.episode != null);
  const crew = [
    result.director ? ["Director", result.director] : null,
    result.musicDirector ? ["Music", result.musicDirector] : null,
    result.choreographer ? ["Choreography", result.choreographer] : null,
    result.producer ? ["Producer", result.producer] : null,
    result.country ? ["Country", result.country] : null,
  ].filter(Boolean) as [string, string][];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: 400 }}>
          <Poster uri={heroUri} seed={title} style={{ flex: 1, borderRadius: 0 }} />
          <LinearGradient colors={["transparent", t.bg]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 140 }} />
          <View style={{ position: "absolute", left: 18, right: 18, top: insets.top + 12, flexDirection: "row", justifyContent: "space-between" }}>
            <IconButton icon="close" label="Close" variant="glass" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} />
            <IconButton icon="share-outline" label="Share" variant="glass" onPress={() => router.push({ pathname: "/share", params: { id: item.id } })} />
          </View>
          <Sticker label={`${result.confidence}% MATCH`} size={15} style={{ position: "absolute", right: 22, bottom: 40 }} />
          {cat?.backdropUrl && cat.posterUrl ? (
            <Poster uri={cat.posterUrl} seed={title} style={{ position: "absolute", left: 20, bottom: 24, width: 92, height: 136, borderWidth: 3, borderColor: t.bg }} />
          ) : null}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -20, gap: 14 }}>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {meta.map((m) => <Chip key={String(m)} label={String(m)} small />)}
          </View>
          <Txt variant="title" size={30}>{title}</Txt>
          <Txt variant="caption" style={{ marginTop: -6 }}>
            {confidenceLabel(result.confidence)} match
            {result.creatorHandle ? ` · ${result.creatorHandle}` : result.creator && result.creator !== title ? ` · ${result.creator}` : ""}
          </Txt>

          {hasEpisode ? (
            <Pressable onPress={() => router.push({ pathname: "/episode", params: { id: item.id } })} accessibilityRole="button">
              <Card padded style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
                <HeroIcon icon="tv-outline" size={48} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Txt variant="overline" color="accent">
                    {[ep?.season != null ? `Season ${ep.season}` : null, ep?.episode != null ? `Episode ${ep.episode}` : null].filter(Boolean).join(" · ")}
                  </Txt>
                  {ep?.episodeTitle ? <Txt variant="strong">{ep.episodeTitle}</Txt> : null}
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.muted} />
              </Card>
            </Pressable>
          ) : null}

          {hasProviders && watch ? (
            <Card padded style={{ gap: 14 }}>
              <Txt variant="overline" color="accent">Where to watch</Txt>
              <ProviderRow label="Stream" providers={watch.stream} onPress={openProvider} />
              <ProviderRow label="Rent" providers={watch.rent} onPress={openProvider} />
              <ProviderRow label="Buy" providers={watch.buy} onPress={openProvider} />
              <Txt variant="caption" style={{ fontSize: 11 }}>Availability data from JustWatch</Txt>
            </Card>
          ) : result.platform ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Button title={`Watch on ${result.platform}`} icon="play" onPress={() => openWatch(result.platform!, title)} style={{ flex: 1 }} height={50} />
            </View>
          ) : null}

          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }}>
            <Action
              icon={item.saved ? "bookmark" : "bookmark-outline"}
              label={item.saved ? "Saved" : "Save"}
              active={item.saved}
              onPress={() => { history.toggleSaved(item.id); haptics.success(); setToast(item.saved ? "Removed from Saved" : "Saved for later"); }}
            />
            <Action icon="play-outline" label="Trailer" onPress={playTrailer} />
            <Action icon="phone-portrait-outline" label="Story" onPress={() => router.push({ pathname: "/share", params: { id: item.id } })} />
            <Action icon="help-circle-outline" label="Not it?" onPress={() => setReportOpen(true)} />
          </View>

          {cast.length ? (
            <>
              <Txt variant="overline">Cast</Txt>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
                {cast.map((m) => (
                  <Pressable key={`${m.id ?? ""}${m.name}`} accessibilityRole="button" accessibilityLabel={m.name} onPress={() => setCastOpen(m)} style={{ width: 72, alignItems: "center", gap: 6 }}>
                    <RingAvatar name={m.name} uri={m.profileUrl} size={56} />
                    <Text numberOfLines={2} style={{ fontFamily: fonts.body[700], fontSize: 11, color: t.ink, textAlign: "center" }}>{m.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          ) : null}

          {result.synopsis ? (
            <>
              <Txt variant="overline">Story</Txt>
              <Txt color="ink">{result.synopsis}</Txt>
            </>
          ) : null}

          {crew.length ? (
            <Card>
              {crew.map(([k, v], i) => (
                <View key={k}>
                  {i > 0 ? <Divider /> : null}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, padding: 14 }}>
                    <Txt variant="caption">{k}</Txt>
                    <Txt variant="strong" style={{ flexShrink: 1, textAlign: "right" }}>{v}</Txt>
                  </View>
                </View>
              ))}
            </Card>
          ) : null}

          {result.identificationClues ? (
            <Card padded style={{ gap: 6, backgroundColor: t.surface2, borderWidth: 0 }}>
              <Txt variant="overline" color="accent">How we found it</Txt>
              <Txt>{result.identificationClues}</Txt>
            </Card>
          ) : null}

          {result.alternativeTitles && result.alternativeTitles.length ? (
            <>
              <Txt variant="overline">Also known as / could be</Txt>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {result.alternativeTitles.map((a) => <Chip key={a} label={a} small onPress={() => openWebSearch(a)} />)}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      <ReportSheet visible={reportOpen} onClose={() => setReportOpen(false)} result={result} onSent={() => setToast("Thanks — that helps us get better")} />
      <CastSheet member={castOpen} onClose={() => setCastOpen(null)} />
      <BottomSheet visible={rateOpen} onClose={() => { setRateOpen(false); update({ ratePrompted: true }); }}>
        <View style={{ alignItems: "center", gap: 12 }}>
          <Txt variant="title" size={24} center>
            <Txt variant="title" size={24} color="accent">{foundCount}</Txt> titles found!
          </Txt>
          <Txt center>Loving Videofy? A quick rating helps other people find it.</Txt>
          <View style={{ alignSelf: "stretch", gap: 4 }}>
            <Button
              title="Rate Videofy"
              onPress={async () => {
                setRateOpen(false);
                update({ ratePrompted: true });
                if (await StoreReview.hasAction()) StoreReview.requestReview();
              }}
            />
            <TextLink title="Maybe later" onPress={() => { setRateOpen(false); update({ ratePrompted: true }); }} />
          </View>
        </View>
      </BottomSheet>
      {toast ? <Toast message={toast} bottom={insets.bottom + 24} /> : null}
    </View>
  );
}
