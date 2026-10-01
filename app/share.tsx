import { Ionicons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import { Share, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import { useHistory } from "@/lib/history-store";
import { posterFor, TYPE_LABELS } from "@/lib/scan-types";
import { Button, Gradient, Poster, Sticker, TopBar } from "@/ui/components";
import { fonts } from "@/ui/theme";

// Share-to-story card: rendered as a view, captured as an image and handed to
// the system share sheet (Instagram/WhatsApp stories, messages, save image…).
export default function ShareScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useHistory();
  const item = items.find((i) => i.id === id);
  const cardRef = useRef<View>(null);
  const [busy, setBusy] = useState(false);
  const result = item?.result;
  const title = result?.title ?? result?.creator ?? "Found with Videofy";
  const sub = [result?.type ? TYPE_LABELS[result.type] ?? result.type : null, result?.year, result?.platform ? `on ${result.platform}` : null].filter(Boolean).join(" · ");

  const shareImage = async () => {
    setBusy(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your find" });
      }
    } catch {
      /* the user dismissed the share sheet */
    } finally {
      setBusy(false);
    }
  };

  const shareText = () =>
    Share.share({ message: `Found it with Videofy: ${title}${sub ? ` (${sub})` : ""}` }).catch(() => {});

  return (
    <Gradient style={{ flex: 1, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20, paddingHorizontal: 20, gap: 18 }}>
      <TopBar left="close" title="Share" />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <View
          ref={cardRef}
          collapsable={false}
          style={{ width: 270, height: 470, borderRadius: 30, backgroundColor: "#0D0B14", overflow: "hidden", transform: [{ rotate: "-3deg" }] }}
        >
          <Poster uri={result ? posterFor(result, item?.thumbUri) : null} seed={title} style={{ height: 300, borderRadius: 0 }} />
          {result?.found ? <Sticker label={`${result.confidence}% MATCH`} style={{ position: "absolute", right: 16, top: 270 }} /> : null}
          <View style={{ padding: 18, gap: 6 }}>
            <Text numberOfLines={2} style={{ fontFamily: fonts.display[700], fontSize: 22, lineHeight: 26, color: "#fff" }}>{title}</Text>
            {sub ? <Text style={{ fontFamily: fonts.body[600], fontSize: 13, color: "#B1A7C6" }}>{sub}</Text> : null}
          </View>
          <View style={{ position: "absolute", left: 18, bottom: 16, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Gradient style={{ width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="scan" size={13} color="#fff" />
            </Gradient>
            <Text style={{ fontFamily: fonts.body[800], fontSize: 12, color: "#fff" }}>found with videofy</Text>
          </View>
        </View>
      </View>
      <Button title="Share image" icon="share-social" variant="white" onPress={shareImage} loading={busy} />
      <Button title="Share as text" variant="secondary" onPress={shareText} style={{ opacity: 0.95 }} />
    </Gradient>
  );
}
