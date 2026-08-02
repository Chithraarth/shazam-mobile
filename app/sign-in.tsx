import { useAuth, useSignIn, useSignUp, useSSO } from "@clerk/expo";
import { Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useState } from "react";
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

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

type Mode = "sign-in" | "sign-up";

export default function SignInScreen() {
  useWarmUpBrowser();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { startSSOFlow } = useSSO();
  const { signIn, errors: signInErrors, fetchStatus: signInStatus } = useSignIn();
  const { signUp, errors: signUpErrors, fetchStatus: signUpStatus } = useSignUp();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [ssoLoading, setSsoLoading] = useState<string | null>(null);

  const busy = signInStatus === "fetching" || signUpStatus === "fetching";

  const handleSSO = useCallback(
    async (strategy: "oauth_google" | "oauth_apple") => {
      setFormError(null);
      setSsoLoading(strategy);
      try {
        const { createdSessionId, setActive } = await startSSOFlow({
          strategy,
          redirectUrl: AuthSession.makeRedirectUri(),
        });
        if (createdSessionId && setActive) {
          await setActive({
            session: createdSessionId,
            navigate: async ({ session }) => {
              if (session?.currentTask) return;
              router.replace("/");
            },
          });
        }
      } catch {
        setFormError("Sign-in was cancelled or failed. Please try again.");
      } finally {
        setSsoLoading(null);
      }
    },
    [startSSOFlow, router]
  );

  const handleEmailSubmit = async () => {
    setFormError(null);
    if (mode === "sign-in") {
      const { error } = await signIn.password({ emailAddress: email, password });
      if (error) {
        setFormError(error.message ?? "Sign-in failed");
        return;
      }
      if (signIn.status === "complete") {
        await signIn.finalize({
          navigate: async () => {
            router.replace("/");
          },
        });
      }
    } else {
      const { error } = await signUp.password({ emailAddress: email, password });
      if (error) {
        setFormError(error.message ?? "Sign-up failed");
        return;
      }
      await signUp.verifications.sendEmailCode();
    }
  };

  const handleVerify = async () => {
    setFormError(null);
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: async () => {
          router.replace("/");
        },
      });
    } else {
      setFormError("Verification failed. Check the code and try again.");
    }
  };

  if (isSignedIn) return <Redirect href="/" />;

  const needsVerification =
    mode === "sign-up" &&
    signUp.status === "missing_requirements" &&
    signUp.unverifiedFields.includes("email_address") &&
    signUp.missingFields.length === 0;

  const fieldError =
    formError ??
    signInErrors.fields.identifier?.message ??
    signInErrors.fields.password?.message ??
    signUpErrors.fields.emailAddress?.message ??
    signUpErrors.fields.password?.message ??
    signUpErrors.fields.code?.message ??
    null;

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
            {needsVerification
              ? "Check your email for a verification code"
              : mode === "sign-in"
              ? "Sign in to identify any movie or show"
              : "Create your account to get started"}
          </Text>
        </View>

        {needsVerification ? (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              value={code}
              onChangeText={setCode}
              placeholder="Verification code"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              autoFocus
            />
            {fieldError && <Text style={styles.error}>{fieldError}</Text>}
            <Pressable onPress={handleVerify} disabled={busy || !code}>
              <LinearGradient
                colors={["#884dff", "#7c3aed"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, (busy || !code) && { opacity: 0.6 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify Email</Text>
                )}
              </LinearGradient>
            </Pressable>
            <Pressable onPress={() => signUp.verifications.sendEmailCode()}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Resend code</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Pressable
              onPress={() => handleSSO("oauth_google")}
              disabled={!!ssoLoading}
              style={({ pressed }) => [
                styles.ssoBtn,
                { backgroundColor: "#fff", opacity: pressed || ssoLoading ? 0.8 : 1 },
              ]}
            >
              {ssoLoading === "oauth_google" ? (
                <ActivityIndicator color="#111" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={20} color="#111" />
                  <Text style={[styles.ssoBtnText, { color: "#111" }]}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <Pressable
              onPress={() => handleSSO("oauth_apple")}
              disabled={!!ssoLoading}
              style={({ pressed }) => [
                styles.ssoBtn,
                { backgroundColor: "#000", borderWidth: 1, borderColor: colors.border, opacity: pressed || ssoLoading ? 0.8 : 1 },
              ]}
            >
              {ssoLoading === "oauth_apple" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="logo-apple" size={22} color="#fff" />
                  <Text style={[styles.ssoBtnText, { color: "#fff" }]}>Continue with Apple</Text>
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
            {fieldError && <Text style={styles.error}>{fieldError}</Text>}

            <Pressable onPress={handleEmailSubmit} disabled={busy || !email || !password}>
              <LinearGradient
                colors={["#884dff", "#7c3aed"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.primaryBtn, (busy || !email || !password) && { opacity: 0.6 }]}
              >
                {busy ? (
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
                  setFormError(null);
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in");
                }}
              >
                <Text style={[styles.linkText, { color: colors.primary }]}>
                  {mode === "sign-in" ? "Sign up" : "Sign in"}
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        <View nativeID="clerk-captcha" />
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
