import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { Linking, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { firebaseErrorMessage } from "@/lib/auth-errors";
import { Button, HeroIcon, Screen, TextField, TopBar, Txt } from "@/ui/components";

export default function ForgotPassword() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState(params.email ?? "");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    setBusy(true);
    try {
      await sendPasswordReset(email.trim());
      setSentTo(email.trim());
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <Screen>
        <TopBar />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
          <HeroIcon icon="mail-open-outline" />
          <Txt variant="title" center>
            Check your <Txt variant="title" color="accent">inbox</Txt>
          </Txt>
          <Txt center>
            We sent a reset link to <Txt color="ink">{sentTo}</Txt>. It works for 1 hour — check spam if you can’t see it.
          </Txt>
        </View>
        <Button title="Open email app" onPress={() => Linking.openURL("mailto:").catch(() => {})} />
        <Button title="Back to sign in" variant="secondary" onPress={() => router.back()} />
        <Button title="Resend link" variant="ghost" onPress={send} loading={busy} />
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <TopBar />
      <Txt variant="title" size={32}>
        Reset your <Txt variant="title" size={32} color="accent">password</Txt>
      </Txt>
      <Txt>Enter your account email and we’ll send you a reset link.</Txt>
      <TextField label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" autoFocus />
      {error ? <Txt color="danger">{error}</Txt> : null}
      <View style={{ flex: 1 }} />
      <Button title="Send reset link" onPress={send} loading={busy} disabled={!email.includes("@")} />
    </Screen>
  );
}
