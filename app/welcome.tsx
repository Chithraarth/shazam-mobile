import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/lib/settings";
import { Button, Card, Dots, Gradient, Poster, Sticker, TextLink, Txt } from "@/ui/components";
import { fonts, useTheme } from "@/ui/theme";

function TvScene({ style }: { style?: object }) {
  return (
    <View style={[{ backgroundColor: "#35586A", borderRadius: 10, overflow: "hidden", borderWidth: 6, borderColor: "#070707" }, style]}>
      <View style={{ position: "absolute", left: "58%", top: "18%", width: 54, height: 54, borderRadius: 27, backgroundColor: "#E59A4A" }} />
      <View style={{ position: "absolute", left: -20, right: -20, top: "60%", height: "70%", borderTopLeftRadius: 999, borderTopRightRadius: 999, backgroundColor: "#1C2C33" }} />
      <View style={{ position: "absolute", left: "22%", top: "35%", width: 34, height: 86, borderTopLeftRadius: 17, borderTopRightRadius: 17, borderRadius: 6, backgroundColor: "#101719" }} />
    </View>
  );
}

function SlidePointAtScreen() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, borderRadius: 34, backgroundColor: t.surface2, overflow: "hidden" }}>
      <TvScene style={{ position: "absolute", left: 24, top: 44, width: 240, height: 150, transform: [{ rotate: "-4deg" }] }} />
      <View style={{ position: "absolute", right: 26, bottom: 24, width: 130, height: 210, borderRadius: 26, backgroundColor: "#0D0B14", borderWidth: 4, borderColor: "#3A3150", transform: [{ rotate: "6deg" }], alignItems: "center", justifyContent: "flex-end", paddingBottom: 16 }}>
        <TvScene style={{ position: "absolute", left: 10, right: 10, top: 18, height: 104, borderWidth: 0 }} />
        <Gradient style={{ width: 44, height: 44, borderRadius: 22 }} />
      </View>
    </View>
  );
}

function SlideReels() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, borderRadius: 34, backgroundColor: t.surface2, overflow: "hidden" }}>
      <Poster seed="dance" style={{ position: "absolute", left: 28, top: 36, width: 150, height: 260, borderRadius: 24, transform: [{ rotate: "-7deg" }] }} />
      <Poster seed="northern" style={{ position: "absolute", left: 150, top: 80, width: 140, height: 240, borderRadius: 24, transform: [{ rotate: "5deg" }] }} />
      <Card padded style={{ position: "absolute", right: 16, bottom: 30, width: 190, gap: 6 }}>
        <Sticker label="CREATOR FOUND" size={10} rotate={0} />
        <Txt variant="strong">Street dance challenge</Txt>
        <Txt variant="caption">@kavya.moves</Txt>
      </Card>
    </View>
  );
}

function SlideWhereToWatch() {
  const t = useTheme();
  return (
    <View style={{ flex: 1, borderRadius: 34, backgroundColor: t.surface2, padding: 22, gap: 12, justifyContent: "center" }}>
      <Card padded style={{ flexDirection: "row", gap: 14 }}>
        <Poster seed="monsoon" style={{ width: 84, height: 124 }} />
        <View style={{ flex: 1, gap: 6 }}>
          <Sticker label="94% MATCH" size={11} rotate={0} />
          <Txt variant="h3" size={16}>The Last Monsoon</Txt>
          <Txt variant="caption">2024 · Movie · Hindi</Txt>
        </View>
      </Card>
      <Gradient style={{ height: 48, borderRadius: 24, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Ionicons name="play" size={14} color="#fff" />
        <Text style={{ fontFamily: fonts.body[800], color: "#fff" }}>Watch on Netflix</Text>
      </Gradient>
      <View style={{ height: 48, borderRadius: 24, backgroundColor: t.surface, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.line }}>
        <Text style={{ fontFamily: fonts.body[800], color: t.ink }}>Prime Video · Rent</Text>
      </View>
    </View>
  );
}

const SLIDES = [
  { title: "Point at ", accent: "any screen", body: "TV, laptop, a friend’s phone — one tap and we name what’s playing.", Art: SlidePointAtScreen },
  { title: "Reels & Shorts ", accent: "too", body: "Viral clip or trend? We find the creator and the original video.", Art: SlideReels },
  { title: "Know ", accent: "where to watch", body: "Cast, episode and the app it’s on — all in one tap.", Art: SlideWhereToWatch },
];

export default function WelcomeScreen() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { update } = useSettings();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

  const finish = () => {
    update({ introSeen: true });
    router.replace("/sign-in");
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 20 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, minHeight: 44 }}>
        <Text style={{ fontFamily: fonts.display[800], fontSize: 18, color: t.ink }}>videofy</Text>
        {!last ? <TextLink title="Skip" onPress={finish} style={{ paddingVertical: 0 }} /> : null}
      </View>
      <ScrollView ref={scrollRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onScrollEnd} style={{ flex: 1 }}>
        {SLIDES.map(({ title, accent, body, Art }) => (
          <View key={accent} style={{ width, paddingHorizontal: 20, paddingTop: 16, gap: 16 }}>
            <View style={{ height: 380 }}><Art /></View>
            <Txt variant="display">
              {title}<Txt variant="display" color="accent">{accent}</Txt>
            </Txt>
            <Txt size={16}>{body}</Txt>
          </View>
        ))}
      </ScrollView>
      <View style={{ paddingHorizontal: 20, gap: 14 }}>
        {last ? (
          <>
            <View style={{ alignItems: "center" }}><Dots count={SLIDES.length} index={index} /></View>
            <Button title="Get started" onPress={finish} />
          </>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Dots count={SLIDES.length} index={index} />
            <Button
              title="Next"
              style={{ width: 150 }}
              onPress={() => {
                const next = index + 1;
                scrollRef.current?.scrollTo({ x: next * width, animated: true });
                setIndex(next);
              }}
            />
          </View>
        )}
      </View>
    </View>
  );
}
