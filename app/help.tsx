import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { emailSupport, SUPPORT_EMAIL } from "@/lib/links";
import { Button, Card, Chip, Divider, Screen, SearchField, TopBar, Txt } from "@/ui/components";
import { useTheme } from "@/ui/theme";

type Topic = "Scanning" | "Payments" | "Account" | "Privacy";

const FAQ: { topic: Topic; q: string; a: string }[] = [
  { topic: "Scanning", q: "How do I get the best match?", a: "Scan a moment with a face or subtitles on screen, fill the frame with the screen and avoid glare. Turn on the flash in dark rooms." },
  { topic: "Scanning", q: "How do I scan something playing on my phone?", a: "Use Screen rec on the Scan tab: record your screen for a few seconds, then pick the recording and the best frame. Or screenshot it and choose Photo." },
  { topic: "Scanning", q: "Can it find Reels and Shorts?", a: "Yes — for viral clips we look for the creator, the trend or meme, and the original video." },
  { topic: "Payments", q: "When is a scan used?", a: "Each scan uses one credit. If something fails on our side — like a server error — the scan is given back automatically." },
  { topic: "Payments", q: "My UPI payment is pending", a: "UPI and cash payments can take a few minutes. Your scans are added automatically once Google Play confirms the payment, even if the app is closed. Tap Restore purchases on the Me tab to check." },
  { topic: "Payments", q: "Do scans expire?", a: "No. Scan packs are a one-time purchase and never expire." },
  { topic: "Account", q: "How do I change my country or languages?", a: "Me → Edit vibe. It only helps break ties between look-alike titles." },
  { topic: "Account", q: "How do I delete my account?", a: "Me → Delete account. Your history and remaining scans are erased permanently." },
  { topic: "Privacy", q: "Is my camera recording?", a: "No. The camera only takes a single photo when you tap Scan. We never record video or sound." },
  { topic: "Privacy", q: "What happens to my scans?", a: "The photo is sent to identify the title. Thumbnails are kept on your phone (you can turn this off in Settings)." },
];

export default function Help() {
  const t = useTheme();
  const [topic, setTopic] = useState<Topic>("Scanning");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(FAQ[0].q);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? FAQ.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q)) : FAQ.filter((f) => f.topic === topic);
  }, [query, topic]);

  return (
    <Screen scroll>
      <TopBar />
      <Txt variant="title">
        How can we <Txt variant="title" color="accent">help?</Txt>
      </Txt>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search questions" />
      {!query ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {(["Scanning", "Payments", "Account", "Privacy"] as Topic[]).map((tp) => <Chip key={tp} label={tp} selected={topic === tp} onPress={() => setTopic(tp)} />)}
        </View>
      ) : null}
      <Card>
        {list.length ? list.map((f, i) => (
          <View key={f.q}>
            {i > 0 ? <Divider /> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === f.q }} onPress={() => setOpen(open === f.q ? null : f.q)} style={{ padding: 16, gap: 8 }}>
              <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                <Txt variant="strong" style={{ flex: 1 }}>{f.q}</Txt>
                <Ionicons name={open === f.q ? "remove" : "add"} size={20} color={open === f.q ? t.accent : t.muted} />
              </View>
              {open === f.q ? <Txt>{f.a}</Txt> : null}
            </Pressable>
          </View>
        )) : <View style={{ padding: 16 }}><Txt>No answers match that. Email us below.</Txt></View>}
      </Card>
      <View style={{ flex: 1 }} />
      <Txt variant="caption" center>We usually reply within a day at {SUPPORT_EMAIL}</Txt>
      <Button title="Email support" icon="mail-outline" onPress={() => emailSupport("Videofy help")} />
    </Screen>
  );
}
