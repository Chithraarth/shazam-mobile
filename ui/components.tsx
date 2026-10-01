import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { ReactNode, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { fonts, GRADIENT, GRADIENT_END, GRADIENT_START, radius, useHaptics, useTheme } from "./theme";

export type IconName = React.ComponentProps<typeof Ionicons>["name"];

/* ───────────────────────── Text ───────────────────────── */

type Variant = "display" | "title" | "h3" | "body" | "strong" | "caption" | "overline";
type ColorKey = "ink" | "muted" | "accent" | "white" | "danger" | "onLime";

const variantStyle: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.display[800], fontSize: 34, lineHeight: 38, letterSpacing: -0.8 },
  title: { fontFamily: fonts.display[700], fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
  h3: { fontFamily: fonts.display[700], fontSize: 18, lineHeight: 22, letterSpacing: -0.3 },
  body: { fontFamily: fonts.body[500], fontSize: 15, lineHeight: 22 },
  strong: { fontFamily: fonts.body[800], fontSize: 15, lineHeight: 20 },
  caption: { fontFamily: fonts.body[600], fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.body[800], fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: "uppercase" },
};

export function Txt({
  variant = "body",
  color,
  size,
  center,
  style,
  children,
  ...rest
}: TextProps & { variant?: Variant; color?: ColorKey | string; size?: number; center?: boolean }) {
  const t = useTheme();
  const defaultColor: ColorKey = variant === "body" || variant === "caption" || variant === "overline" ? "muted" : "ink";
  const key = color ?? defaultColor;
  const resolved = key in t ? (t as unknown as Record<string, string>)[key] : key;
  return (
    <Text
      {...rest}
      style={[
        variantStyle[variant],
        { color: resolved },
        size ? { fontSize: size, lineHeight: Math.round(size * (variant === "body" ? 1.45 : 1.15)) } : null,
        center ? { textAlign: "center" } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ───────────────────────── Gradient ───────────────────────── */

export function Gradient({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <LinearGradient colors={GRADIENT} start={GRADIENT_START} end={GRADIENT_END} style={style}>
      {children}
    </LinearGradient>
  );
}

/* ───────────────────────── Buttons ───────────────────────── */

type ButtonVariant = "primary" | "secondary" | "danger" | "white" | "ghost";

export function Button({
  title,
  onPress,
  variant = "primary",
  icon,
  loading,
  disabled,
  height = 56,
  style,
  accessibilityLabel,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  const haptics = useHaptics();
  const fg =
    variant === "primary" || variant === "danger" ? t.white
    : variant === "white" ? "#C0106D"
    : variant === "ghost" ? t.accent
    : t.ink;
  const bg =
    variant === "secondary" ? t.surface2
    : variant === "danger" ? t.danger
    : variant === "white" ? t.white
    : "transparent";

  const content = loading ? (
    <ActivityIndicator color={fg} />
  ) : (
    <>
      {icon ? <Ionicons name={icon} size={19} color={fg} /> : null}
      <Text style={{ fontFamily: fonts.body[800], fontSize: 16, color: fg }}>{title}</Text>
    </>
  );

  const inner: ViewStyle = {
    height,
    borderRadius: height / 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 20,
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      disabled={disabled || loading}
      onPress={() => { haptics.tap(); onPress?.(); }}
      style={({ pressed }) => [{ opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}
    >
      {variant === "primary" ? (
        <Gradient style={inner}>{content}</Gradient>
      ) : (
        <View style={[inner, { backgroundColor: bg }]}>{content}</View>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  variant = "soft",
  size = 44,
  iconSize = 20,
  style,
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  variant?: "soft" | "glass" | "lime" | "grad";
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const haptics = useHaptics();
  const base: ViewStyle = { width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" };
  const color = variant === "glass" || variant === "grad" ? t.white : variant === "lime" ? t.onLime : t.ink;
  const icn = <Ionicons name={icon} size={iconSize} color={color} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => { haptics.tap(); onPress?.(); }}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }, style]}
    >
      {variant === "grad" ? (
        <Gradient style={base}>{icn}</Gradient>
      ) : (
        <View
          style={[
            base,
            {
              backgroundColor:
                variant === "glass" ? "rgba(13,11,20,0.55)" : variant === "lime" ? t.lime : t.surface2,
            },
          ]}
        >
          {icn}
        </View>
      )}
    </Pressable>
  );
}

export function TextLink({ title, onPress, color, style }: { title: string; onPress?: () => void; color?: string; style?: StyleProp<TextStyle> }) {
  const t = useTheme();
  return (
    <Text
      accessibilityRole="link"
      onPress={onPress}
      suppressHighlighting
      style={[{ fontFamily: fonts.body[800], fontSize: 15, color: color ?? t.accent, textAlign: "center", paddingVertical: 10 }, style]}
    >
      {title}
    </Text>
  );
}

/* ───────────────────────── Chips & stickers ───────────────────────── */

export function Chip({
  label,
  selected,
  onPress,
  leading,
  tone = "default",
  small,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: string;
  tone?: "default" | "ok" | "outline";
  small?: boolean;
  icon?: IconName;
}) {
  const t = useTheme();
  const haptics = useHaptics();
  const h = small ? 30 : 40;
  const fg = selected ? t.white : tone === "ok" ? t.onLime : tone === "outline" ? t.accent : t.ink;
  const body = (
    <>
      {icon ? <Ionicons name={icon} size={small ? 12 : 15} color={fg} /> : null}
      {leading ? <Text style={{ fontFamily: fonts.display[700], fontSize: small ? 11 : 14, color: fg }}>{leading}</Text> : null}
      <Text style={{ fontFamily: fonts.body[700], fontSize: small ? 12 : 14, color: fg }}>{label}</Text>
    </>
  );
  const style: ViewStyle = {
    height: h,
    paddingHorizontal: small ? 10 : 16,
    borderRadius: h / 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  };
  const view = selected ? (
    <Gradient style={style}>{body}</Gradient>
  ) : (
    <View
      style={[
        style,
        tone === "ok" ? { backgroundColor: t.lime }
        : tone === "outline" ? { borderWidth: 1.5, borderColor: t.accent }
        : { backgroundColor: t.surface2 },
      ]}
    >
      {body}
    </View>
  );
  if (!onPress) return view;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { haptics.tap(); onPress(); }}>
      {view}
    </Pressable>
  );
}

export function Sticker({ label, rotate = -5, size = 13, style }: { label: string; rotate?: number; size?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      style={[
        {
          alignSelf: "flex-start",
          paddingHorizontal: size * 0.9,
          paddingVertical: size * 0.5,
          borderRadius: 12,
          backgroundColor: t.lime,
          transform: [{ rotate: `${rotate}deg` }],
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: 4,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.display[700], fontSize: size, color: t.onLime }}>{label}</Text>
    </View>
  );
}

/* ───────────────────────── Surfaces & lists ───────────────────────── */

export function Card({ children, style, padded }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  const t = useTheme();
  return (
    <View
      style={[
        { backgroundColor: t.surface, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: t.line, overflow: "hidden" },
        padded ? { padding: 16 } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line }} />;
}

export function ListRow({
  title,
  subtitle,
  value,
  icon,
  onPress,
  danger,
  chevron,
  right,
}: {
  title: string;
  subtitle?: string;
  value?: string;
  icon?: IconName;
  onPress?: () => void;
  danger?: boolean;
  chevron?: boolean;
  right?: ReactNode;
}) {
  const t = useTheme();
  const haptics = useHaptics();
  const row = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: subtitle ? 12 : 15, minHeight: 52 }}>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={icon} size={18} color={danger ? t.danger : t.ink} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontFamily: fonts.body[700], fontSize: 15, color: danger ? t.danger : t.ink }}>{title}</Text>
        {subtitle ? <Text style={{ fontFamily: fonts.body[500], fontSize: 13, color: t.muted }}>{subtitle}</Text> : null}
      </View>
      {value ? <Text style={{ fontFamily: fonts.body[600], fontSize: 14, color: t.muted }}>{value}</Text> : null}
      {right}
      {chevron ? <Ionicons name="chevron-forward" size={18} color={t.muted} /> : null}
    </View>
  );
  if (!onPress) return row;
  return (
    <Pressable accessibilityRole="button" onPress={() => { haptics.tap(); onPress(); }} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {row}
    </Pressable>
  );
}

/* ───────────────────────── Controls ───────────────────────── */

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const t = useTheme();
  const haptics = useHaptics();
  const knob = (
    <View style={{ position: "absolute", top: 4, left: value ? 26 : 4, width: 22, height: 22, borderRadius: 11, backgroundColor: value ? t.white : t.muted }} />
  );
  const track: ViewStyle = { width: 52, height: 30, borderRadius: 15 };
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={label} accessibilityState={{ checked: value }} hitSlop={8} onPress={() => { haptics.tap(); onChange(!value); }}>
      {value ? <Gradient style={track}>{knob}</Gradient> : <View style={[track, { backgroundColor: t.surface2, borderWidth: 1, borderColor: t.line }]}>{knob}</View>}
    </Pressable>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  const haptics = useHaptics();
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.surface2, borderRadius: 24, padding: 4 }}>
      {options.map((o) => {
        const on = o.value === value;
        const label = <Text style={{ fontFamily: fonts.body[800], fontSize: 14, color: on ? t.white : t.muted }}>{o.label}</Text>;
        const cell: ViewStyle = { height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" };
        return (
          <Pressable key={o.value} style={{ flex: 1 }} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { haptics.tap(); onChange(o.value); }}>
            {on ? <Gradient style={cell}>{label}</Gradient> : <View style={cell}>{label}</View>}
          </Pressable>
        );
      })}
    </View>
  );
}

export function Radio({ selected }: { selected: boolean }) {
  const t = useTheme();
  if (selected) {
    return (
      <Gradient style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.white }} />
      </Gradient>
    );
  }
  return <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: t.line }} />;
}

export function Checkbox({ checked }: { checked: boolean }) {
  const t = useTheme();
  if (checked) {
    return (
      <Gradient style={{ width: 24, height: 24, borderRadius: 8, alignItems: "center", justifyContent: "center" }}>
        <Ionicons name="checkmark" size={16} color={t.white} />
      </Gradient>
    );
  }
  return <View style={{ width: 24, height: 24, borderRadius: 8, borderWidth: 2, borderColor: t.line }} />;
}

export function ProgressSteps({ total, current }: { total: number; current: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6, flex: 1 }}>
      {Array.from({ length: total }, (_, i) =>
        i < current ? (
          <Gradient key={i} style={{ flex: 1, height: 6, borderRadius: 3 }} />
        ) : (
          <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: t.surface2 }} />
        ),
      )}
    </View>
  );
}

export function Dots({ count, index }: { count: number; index: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {Array.from({ length: count }, (_, i) =>
        i === index ? (
          <Gradient key={i} style={{ width: 26, height: 8, borderRadius: 4 }} />
        ) : (
          <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.surface2 }} />
        ),
      )}
    </View>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  return (
    <View style={{ height: 10, borderRadius: 5, backgroundColor: t.surface2, overflow: "hidden" }}>
      <Gradient style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, height: 10, borderRadius: 5 }} />
    </View>
  );
}

/* ───────────────────────── Icons, avatars, posters ───────────────────────── */

export function HeroIcon({ icon, variant = "grad", size = 104, iconSize, rotate }: { icon: IconName; variant?: "grad" | "soft" | "danger"; size?: number; iconSize?: number; rotate?: number }) {
  const t = useTheme();
  const style: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size * 0.33,
    alignItems: "center",
    justifyContent: "center",
    transform: rotate ? [{ rotate: `${rotate}deg` }] : undefined,
  };
  const s = iconSize ?? size * 0.45;
  if (variant === "grad") {
    return <Gradient style={style}><Ionicons name={icon} size={s} color={t.white} /></Gradient>;
  }
  return (
    <View style={[style, { backgroundColor: t.surface2 }]}>
      <Ionicons name={icon} size={s} color={variant === "danger" ? t.danger : t.accent} />
    </View>
  );
}

const AVATAR_TINTS = ["#F2C9A8", "#B7C9A8", "#9DB8C7", "#D9B8A6", "#C8B6E2", "#F2B8C6"];
const POSTER_TINTS = [
  ["#1F4A4F", "#E8964A"],
  ["#3B2A4A", "#C8A2E0"],
  ["#5A2E2A", "#F2C5A0"],
  ["#27394F", "#9DB8C7"],
  ["#4A2E3A", "#E3A7B5"],
  ["#3E4A2E", "#D9C27A"],
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function RingAvatar({ name, size = 56, icon, uri }: { name?: string; size?: number; icon?: IconName; uri?: string | null }) {
  const t = useTheme();
  const tint = name ? AVATAR_TINTS[hash(name) % AVATAR_TINTS.length] : t.surface2;
  return (
    <Gradient style={{ padding: 3, borderRadius: (size + 12) / 2 }}>
      <View style={{ padding: 3, borderRadius: (size + 6) / 2, backgroundColor: t.bg }}>
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: tint, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {uri ? (
            <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
          ) : icon ? (
            <Ionicons name={icon} size={size * 0.45} color={t.ink} />
          ) : (
            <Text style={{ fontFamily: fonts.body[800], fontSize: size * 0.32, color: "#16111F" }}>{initials(name ?? "")}</Text>
          )}
        </View>
      </View>
    </Gradient>
  );
}

// The scanned frame when we have it, otherwise a flat colour block seeded by
// the title so the same title always gets the same colours.
export function Poster({ uri, seed = "", style, children }: { uri?: string | null; seed?: string; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const [bg, sun] = POSTER_TINTS[hash(seed) % POSTER_TINTS.length];
  return (
    <View style={[{ backgroundColor: bg, borderRadius: 16, overflow: "hidden" }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <>
          <View style={{ position: "absolute", right: "-10%", top: "12%", width: "62%", aspectRatio: 1, borderRadius: 999, backgroundColor: sun, opacity: 0.9 }} />
          <View style={{ position: "absolute", left: "-20%", right: "-20%", top: "62%", height: "70%", borderTopLeftRadius: 999, borderTopRightRadius: 999, backgroundColor: "rgba(0,0,0,0.28)" }} />
        </>
      )}
      {children}
    </View>
  );
}

export function Skeleton({ width, height, radius: r = 10, style }: { width?: ViewStyle["width"]; height: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [pulse]);
  return <Animated.View style={[{ width: width ?? "100%", height, borderRadius: r, backgroundColor: t.surface2, opacity: pulse }, style]} />;
}

/* ───────────────────────── Layout ───────────────────────── */

export function Screen({
  children,
  scroll,
  padded = true,
  tabBar,
  style,
  contentStyle,
  keyboard,
}: {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  tabBar?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  keyboard?: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const pad: ViewStyle = {
    paddingTop: insets.top + 12,
    paddingBottom: (tabBar ? 110 : 20) + insets.bottom,
    paddingHorizontal: padded ? 20 : 0,
    gap: 16,
  };
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[pad, { flexGrow: 1 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, pad, contentStyle]}>{children}</View>
  );
  return (
    <View style={[{ flex: 1, backgroundColor: t.bg }, style]}>
      {keyboard ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </View>
  );
}

export function TopBar({
  left = "back",
  title,
  right,
  onLeft,
}: {
  left?: "back" | "close" | "none";
  title?: string;
  right?: ReactNode;
  onLeft?: () => void;
}) {
  const router = useRouter();
  const goBack = onLeft ?? (() => (router.canGoBack() ? router.back() : router.replace("/")));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, gap: 12 }}>
      {left === "none" ? (
        <View style={{ width: 44 }} />
      ) : (
        <IconButton icon={left === "back" ? "chevron-back" : "close"} label={left === "back" ? "Back" : "Close"} onPress={goBack} />
      )}
      {title ? <Txt variant="strong" style={{ flex: 1, textAlign: "center" }} numberOfLines={1}>{title}</Txt> : <View style={{ flex: 1 }} />}
      {right ?? <View style={{ width: 44 }} />}
    </View>
  );
}

/* ───────────────────────── Inputs ───────────────────────── */

export function TextField({ label, right, style, ...props }: TextInputProps & { label?: string; right?: ReactNode }) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      {label ? <Txt variant="caption" style={{ fontFamily: fonts.body[800] }}>{label}</Txt> : null}
      <View
        style={{
          height: 58,
          borderRadius: 20,
          backgroundColor: t.surface2,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 18,
          gap: 10,
          borderWidth: 2,
          borderColor: focused ? t.accent : "transparent",
        }}
      >
        <TextInput
          placeholderTextColor={t.muted}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={[{ flex: 1, color: t.ink, fontFamily: fonts.body[700], fontSize: 17 }, style]}
        />
        {right}
      </View>
    </View>
  );
}

export function SearchField(props: TextInputProps) {
  const t = useTheme();
  return (
    <View style={{ height: 52, borderRadius: 26, backgroundColor: t.surface2, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, gap: 10 }}>
      <Ionicons name="search" size={18} color={t.muted} />
      <TextInput
        placeholderTextColor={t.muted}
        autoCorrect={false}
        {...props}
        style={{ flex: 1, color: t.ink, fontFamily: fonts.body[600], fontSize: 15 }}
      />
    </View>
  );
}

export function OtpInput({ value, onChange, length = 6, autoFocus }: { value: string; onChange: (v: string) => void; length?: number; autoFocus?: boolean }) {
  const t = useTheme();
  const ref = useRef<TextInput>(null);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code">
      <View style={{ flexDirection: "row", gap: 8 }}>
        {Array.from({ length }, (_, i) => {
          const active = i === Math.min(value.length, length - 1);
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: 64,
                borderRadius: 20,
                backgroundColor: t.surface2,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: active ? t.accent : "transparent",
              }}
            >
              <Text style={{ fontFamily: fonts.display[700], fontSize: 26, color: t.ink }}>{value[i] ?? ""}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, "").slice(0, length))}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        maxLength={length}
        style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
      />
    </Pressable>
  );
}

/* ───────────────────────── Overlays ───────────────────────── */

export function BottomSheet({ visible, onClose, children }: { visible: boolean; onClose: () => void; children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: t.scrim }} onPress={onClose} accessibilityLabel="Close" />
      <View
        style={{
          backgroundColor: t.surface,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: insets.bottom + 24,
          gap: 14,
          maxHeight: "88%",
        }}
      >
        <View style={{ alignSelf: "center", width: 42, height: 5, borderRadius: 3, backgroundColor: t.line }} />
        {children}
      </View>
    </Modal>
  );
}

export function Dialog({
  visible,
  title,
  message,
  icon,
  primary,
  secondary,
  onClose,
}: {
  visible: boolean;
  title: string;
  message?: string;
  icon?: IconName;
  primary: { title: string; onPress: () => void; variant?: ButtonVariant; loading?: boolean };
  secondary?: { title: string; onPress: () => void };
  onClose?: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose ?? (() => {})} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: t.scrim, justifyContent: "center", padding: 24 }}>
        <View style={{ backgroundColor: t.surface, borderRadius: 32, padding: 24, gap: 14, alignItems: icon ? "center" : "stretch" }}>
          {icon ? <HeroIcon icon={icon} size={80} /> : null}
          <Txt variant="title" size={24} center={!!icon}>{title}</Txt>
          {message ? <Txt center={!!icon}>{message}</Txt> : null}
          <View style={{ alignSelf: "stretch", gap: 8, marginTop: 4 }}>
            <Button title={primary.title} onPress={primary.onPress} variant={primary.variant} loading={primary.loading} />
            {secondary ? <Button title={secondary.title} onPress={secondary.onPress} variant="secondary" /> : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Toast({ message, actionLabel, onAction, bottom = 110 }: { message: string; actionLabel?: string; onAction?: () => void; bottom?: number }) {
  const t = useTheme();
  return (
    <View
      style={{
        position: "absolute",
        left: 16,
        right: 16,
        bottom,
        minHeight: 58,
        borderRadius: 29,
        backgroundColor: t.ink,
        flexDirection: "row",
        alignItems: "center",
        paddingLeft: 20,
        paddingRight: 8,
        gap: 12,
      }}
    >
      <Text style={{ flex: 1, fontFamily: fonts.body[800], fontSize: 15, color: t.bg }}>{message}</Text>
      {actionLabel ? <Button title={actionLabel} onPress={onAction} height={42} /> : null}
    </View>
  );
}

export function OfflineBanner() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: t.surface2 }}>
      <Ionicons name="cloud-offline-outline" size={18} color={t.accent} />
      <Txt variant="caption" color="ink" style={{ flex: 1 }}>You’re offline. Scanning resumes when you reconnect.</Txt>
    </View>
  );
}
