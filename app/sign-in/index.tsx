import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { ReactNode, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { firebaseErrorMessage } from "@/lib/auth-errors";
import { openPrivacy, openTerms } from "@/lib/links";
import { Gradient, Screen, Sticker, Txt } from "@/ui/components";
import { fonts, useHaptics, useTheme } from "@/ui/theme";

function Option({
  icon,
  title,
  subtitle,
  onPress,
  highlight,
  badge,
  loading,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  highlight?: boolean;
  badge?: string;
  loading?: boolean;
}) {
  const t = useTheme();
  const haptics = useHaptics();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={loading}
      onPress={() => { haptics.tap(); onPress(); }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        padding: 16,
        borderRadius: 24,
        backgroundColor: t.surface,
        borderWidth: highlight ? 2 : 1.5,
        borderColor: highlight ? t.pink : t.line,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: t.surface2, alignItems: "center", justifyContent: "center" }}>
        {icon}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Txt variant="strong" size={16}>{title}</Txt>
        <Txt variant="caption">{subtitle}</Txt>
      </View>
      {loading ? <ActivityIndicator color={t.accent} /> : badge ? <Sticker label={badge} size={10} rotate={0} /> : <Ionicons name="chevron-forward" size={18} color={t.muted} />}
    </Pressable>
  );
}

// Screen D: one place to pick Google, mobile number or email. New and
// returning users share it — an account is created if there isn't one.
export default function SignInChooser() {
  const t = useTheme();
  const router = useRouter();
  const { isSignedIn, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isSignedIn) return <Redirect href="/" />;

  const google = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <Screen scroll>
      <View style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ fontFamily: fonts.display[800], fontSize: 18, color: t.ink }}>videofy</Text>
      </View>
      <Gradient style={{ width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", marginTop: 12 }}>
        <Ionicons name="scan" size={32} color="#fff" />
      </Gradient>
      <Txt variant="title" size={30}>
        How do you want to <Txt variant="title" size={30} color="accent">continue?</Txt>
      </Txt>
      <Txt>New here or coming back — pick one. We’ll create your account if you don’t have one.</Txt>

      <View style={{ gap: 12, marginTop: 6 }}>
        <Option
          icon={<Text style={{ fontFamily: fonts.display[800], fontSize: 20, color: t.ink }}>G</Text>}
          title="Continue with Google"
          subtitle="One tap, no password"
          badge="FASTEST"
          highlight
          loading={googleLoading}
          onPress={google}
        />
        <Option
          icon={<Ionicons name="phone-portrait-outline" size={22} color={t.ink} />}
          title="Continue with mobile"
          subtitle="We’ll text you a 6-digit code"
          onPress={() => router.push("/sign-in/phone")}
        />
        <Option
          icon={<Ionicons name="mail-outline" size={22} color={t.ink} />}
          title="Continue with email"
          subtitle="Sign in or create a password"
          onPress={() => router.push("/sign-in/email")}
        />
      </View>

      {error ? <Txt color="danger" center>{error}</Txt> : null}

      <View style={{ flex: 1 }} />
      <Txt variant="caption" center>
        By continuing you agree to our{" "}
        <Txt variant="caption" color="accent" onPress={openTerms} style={{ fontFamily: fonts.body[800] }}>Terms</Txt> and{" "}
        <Txt variant="caption" color="accent" onPress={openPrivacy} style={{ fontFamily: fonts.body[800] }}>Privacy Policy</Txt>.
      </Txt>
    </Screen>
  );
}
