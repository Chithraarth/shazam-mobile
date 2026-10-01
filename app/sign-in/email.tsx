import { Ionicons } from "@expo/vector-icons";
import { Redirect, useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { firebaseErrorMessage } from "@/lib/auth-errors";
import { Button, Screen, Segmented, TextField, TextLink, TopBar, Txt } from "@/ui/components";
import { useTheme } from "@/ui/theme";

type Mode = "sign-in" | "sign-up";

export default function EmailSignIn() {
  const t = useTheme();
  const router = useRouter();
  const { isSignedIn, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isSignedIn) return <Redirect href="/" />;

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "sign-in") await signInWithEmail(email.trim(), password);
      else await signUpWithEmail(email.trim(), password);
    } catch (err) {
      setError(firebaseErrorMessage(err));
      setBusy(false);
    }
  };

  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 8 ? 2 : /\d/.test(password) && /[A-Za-z]/.test(password) ? 4 : 3;

  return (
    <Screen scroll keyboard>
      <TopBar />
      <Segmented<Mode>
        value={mode}
        onChange={(m) => { setMode(m); setError(null); }}
        options={[{ value: "sign-in", label: "Sign in" }, { value: "sign-up", label: "Create account" }]}
      />
      <Txt variant="title" size={32}>
        {mode === "sign-in" ? "Welcome " : "Let’s get "}
        <Txt variant="title" size={32} color="accent">{mode === "sign-in" ? "back" : "you in"}</Txt>
      </Txt>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder={mode === "sign-in" ? "Your password" : "At least 6 characters"}
        secureTextEntry={!show}
        autoCapitalize="none"
        autoComplete={mode === "sign-in" ? "password" : "new-password"}
        textContentType={mode === "sign-in" ? "password" : "newPassword"}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel={show ? "Hide password" : "Show password"} hitSlop={10} onPress={() => setShow((s) => !s)}>
            <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={20} color={t.muted} />
          </Pressable>
        }
      />
      {mode === "sign-up" && password.length > 0 ? (
        <View style={{ flexDirection: "row", gap: 6 }}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i <= strength ? t.accent : t.surface2 }} />
          ))}
        </View>
      ) : null}
      {mode === "sign-in" ? (
        <TextLink title="Forgot password?" onPress={() => router.push({ pathname: "/sign-in/forgot", params: { email } })} style={{ alignSelf: "flex-end", paddingVertical: 0 }} />
      ) : null}
      {error ? <Txt color="danger">{error}</Txt> : null}
      <View style={{ flex: 1 }} />
      <Button
        title={mode === "sign-in" ? "Sign in" : "Create account"}
        onPress={submit}
        loading={busy}
        disabled={!email.trim() || password.length < 6}
      />
    </Screen>
  );
}
