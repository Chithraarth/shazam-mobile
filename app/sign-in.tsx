import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import * as Localization from "expo-localization";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/lib/auth-context";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { DEFAULT_COUNTRY_ISO2 } from "@/lib/countries";
import type { ConfirmationResult } from "@react-native-firebase/auth";

function guessDefaultCountry(): string {
  return Localization.getLocales()[0]?.regionCode ?? DEFAULT_COUNTRY_ISO2;
}

type Mode = "sign-in" | "sign-up";
type Method = "email" | "phone";
const RESEND_SECONDS = 60;

// Returns null for errors that shouldn't be shown to the user at all (e.g. the
// user simply cancelled a sign-in flow).
function firebaseErrorMessage(err: unknown): string | null {
  const code = (err as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return null;
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
    case "auth/invalid-phone-number":
      return "Please enter a valid phone number, including country code (e.g. +1...).";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Please try again.";
    case "auth/code-expired":
      return "That code has expired. Please request a new one.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled for this app yet.";
    case "auth/operation-not-supported-in-this-environment":
      return "Google Play Services is required for Google sign-in on this device.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/quota-exceeded":
      return "SMS quota exceeded. Please try again later.";
    case "auth/missing-verification-code":
      return "Please enter the verification code.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function useResendTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);
  return { secondsLeft, start: () => setSecondsLeft(RESEND_SECONDS) };
}

function PasswordField({
  value,
  onChangeText,
  colors,
  onFocus,
}: {
  value: string;
  onChangeText: (v: string) => void;
  colors: ReturnType<typeof useColors>;
  onFocus?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View style={{ position: "relative" }}>
      <TextInput
        style={[
          styles.input,
          { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, paddingRight: 46 },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder="Password"
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={!visible}
        onFocus={onFocus}
      />
      <Pressable
        onPress={() => setVisible((v) => !v)}
        hitSlop={12}
        style={{ position: "absolute", right: 16, top: 0, bottom: 0, justifyContent: "center" }}
      >
        <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={20} color={colors.mutedForeground} />
      </Pressable>
    </View>
  );
}

export default function SignInScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isSignedIn, signInWithGoogle, signInWithEmail, signUpWithEmail, sendPhoneOtp, confirmPhoneOtp } = useAuth();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [countryIso2, setCountryIso2] = useState(guessDefaultCountry);
  const [nationalNumber, setNationalNumber] = useState("");
  const [code, setCode] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "email" | "send" | "verify" | null>(null);
  const { secondsLeft, start } = useResendTimer();
  const scrollRef = useRef<ScrollView>(null);

  if (isSignedIn) return <Redirect href="/" />;

  const busy = loading !== null;

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setLoading("google");
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = firebaseErrorMessage(err);
      if (message) setError(message);
    } finally {
      setLoading(null);
    }
  };

  const handleEmailSubmit = async () => {
    setError(null);
    setNotice(null);
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

  const handleSendCode = async (isResend = false) => {
    setError(null);
    setNotice(null);
    const parsed = parsePhoneNumberFromString(nationalNumber, countryIso2 as never);
    if (!parsed?.isValid()) {
      setError("Please enter a valid phone number for the selected country.");
      return;
    }
    setLoading("send");
    try {
      const result = await sendPhoneOtp(parsed.number);
      setConfirmation(result);
      start();
      setNotice(isResend ? "OTP resent successfully." : "OTP sent successfully.");
    } catch (err) {
      const message = firebaseErrorMessage(err);
      if (message) setError(message);
    } finally {
      setLoading(null);
    }
  };

  const handleVerifyCode = async () => {
    if (!confirmation) return;
    setError(null);
    setNotice(null);
    setLoading("verify");
    try {
      await confirmPhoneOtp(confirmation, code);
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setLoading(null);
    }
  };

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
        ref={scrollRef}
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

          <View style={[styles.methodTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {(["email", "phone"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => {
                  setError(null);
                  setNotice(null);
                  setMethod(m);
                }}
                style={[styles.methodTab, method === m && { backgroundColor: colors.primary }]}
              >
                <Text
                  style={[
                    styles.methodTabText,
                    { color: method === m ? "#fff" : colors.mutedForeground },
                  ]}
                >
                  {m === "email" ? "Email" : "Phone"}
                </Text>
              </Pressable>
            ))}
          </View>

          {method === "email" ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                keyboardType="email-address"
                onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
              />
              <PasswordField
                value={password}
                onChangeText={setPassword}
                colors={colors}
                onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
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
            </>
          ) : !confirmation ? (
            <>
              <View style={styles.phoneRow}>
                <CountryCodeSelect value={countryIso2} onChange={setCountryIso2} />
                <TextInput
                  style={[
                    styles.input,
                    styles.phoneInput,
                    { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground },
                  ]}
                  value={nationalNumber}
                  onChangeText={setNationalNumber}
                  placeholder="555 123 4567"
                  placeholderTextColor={colors.mutedForeground}
                  keyboardType="phone-pad"
                  onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                />
              </View>
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable onPress={() => handleSendCode(false)} disabled={busy || !nationalNumber}>
                <LinearGradient
                  colors={["#884dff", "#7c3aed"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryBtn, (busy || !nationalNumber) && { opacity: 0.6 }]}
                >
                  {loading === "send" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send code</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </>
          ) : (
            <>
              {notice && <Text style={styles.notice}>{notice}</Text>}
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, letterSpacing: 4 }]}
                value={code}
                onChangeText={setCode}
                placeholder="123456"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
                onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable onPress={handleVerifyCode} disabled={busy || !code}>
                <LinearGradient
                  colors={["#884dff", "#7c3aed"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.primaryBtn, (busy || !code) && { opacity: 0.6 }]}
                >
                  {loading === "verify" ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>Verify & continue</Text>
                  )}
                </LinearGradient>
              </Pressable>
              <Pressable onPress={() => handleSendCode(true)} disabled={secondsLeft > 0 || busy} style={{ alignItems: "center", marginTop: 4 }}>
                <Text style={[styles.linkText, secondsLeft > 0 && { color: colors.mutedForeground }, secondsLeft <= 0 && { color: colors.primary }]}>
                  {secondsLeft > 0 ? `Resend code in ${secondsLeft}s` : "Resend code"}
                </Text>
              </Pressable>
            </>
          )}
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
  methodTabs: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    marginBottom: 4,
  },
  methodTab: {
    flex: 1,
    borderRadius: 9,
    paddingVertical: 9,
    alignItems: "center",
  },
  methodTabText: { fontSize: 14, fontWeight: "600" },
  phoneRow: { flexDirection: "row", gap: 8 },
  phoneInput: { flex: 1 },
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
  notice: { color: "#4ade80", fontSize: 13, textAlign: "center" },
});
