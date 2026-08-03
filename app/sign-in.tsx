import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import React, { useState } from "react";
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
import { useAuth } from "@/lib/auth-context";

type Mode = "sign-in" | "sign-up";

function firebaseErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/email-already-in-use":
      return "An account already exists with this email.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn, signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "email" | null>(null);

  if (isSignedIn) return <Redirect href="/" />;

  const handleGoogle = async () => {
    setError(null);
    setLoading("google");
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSubmit = async () => {
    setError(null);
    setLoading("email");
    try {
      if (mode === "sign-in") {
        await signInWithEmail(email, password);
      } else {
        await signUpWithEmail(email, password);
      }
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(136,77,255,0.14)", colors.background]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: (Platform.OS === "web" ? 67 : insets.top) + 40, paddingBottom: 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={["#884dff", "#7c3aed"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoCircle}
          >
            <Ionicons name="film" size={30} color="#fff" />
          </LinearGradient>
          <Text style={[styles.title, { color: colors.foreground }]}>Videofy</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {mode === "sign-in"
              ? "Sign in to identify any movie or show"
              : "Create your account to get started"}
          </Text>
        </View>

        <View style={styles.form}>
          <Pressable
            onPress={handleGoogle}
            disabled={busy}
            style={({ pressed }) => [
              styles.ssoBtn,
              { backgroundColor: "#fff", opacity: pressed || busy ? 0.8 : 1 },
            ]}
          >
            {loading === "google" ? (
              <ActivityIndicator color="#111" />
            ) : (
              <>
                <Ionicons name="logo-google" size={20} color="#111" />
                <Text style={[styles.ssoBtnText, { color: "#111" }]}>Continue with Google</Text>
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.mutedForeground }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={email}
            onChangeText={setEmail}
            placeholder="Email address"
            placeholderTextColor={colors.mutedForeground}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={colors.mutedForeground}
            secureTextEntry
          />
          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={handleEmailSubmit} disabled={busy || !email || !password}>
            <LinearGradient
              colors={["#884dff", "#7c3aed"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.primaryBtn, (busy || !email || !password) && { opacity: 0.6 }]}
            >
              {loading === "email" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === "sign-in" ? "Sign In" : "Create Account"}
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          <View style={styles.switchRow}>
            <Text style={{ color: colors.mutedForeground, fontSize: 14 }}>
              {mode === "sign-in" ? "Don't have an account?" : "Already have an account?"}
            </Text>
            <Pressable
              onPress={() => {
                setError(null);
                setMode(mode === "sign-in" ? "sign-up" : "sign-in");
              }}
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {mode === "sign-in" ? "Sign up" : "Sign in"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 32 },
  header: { alignItems: "center", gap: 12 },
  logoCircle: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: { fontSize: 28, fontWeight: "800", letterSpacing: 0.3 },
  subtitle: { fontSize: 15, textAlign: "center", lineHeight: 21 },
  form: { gap: 12 },
  ssoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 14,
    paddingVertical: 15,
  },
  ssoBtnText: { fontSize: 16, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dividerText: { fontSize: 13 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  primaryBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontSize: 17, fontWeight: "700" },
  switchRow: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 8 },
  linkText: { fontSize: 14, fontWeight: "600", textAlign: "center" },
  error: { color: "#f87171", fontSize: 13, textAlign: "center" },
});
