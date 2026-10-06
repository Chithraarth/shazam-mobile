import type { ConfirmationResult } from "@react-native-firebase/auth";
import * as Localization from "expo-localization";
import { Redirect } from "expo-router";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import React, { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { CountryCodeSelect } from "@/components/CountryCodeSelect";
import { useAuth } from "@/lib/auth-context";
import { firebaseErrorMessage } from "@/lib/auth-errors";
import { DEFAULT_COUNTRY_ISO2 } from "@/lib/countries";
import { Button, OtpInput, Screen, TextField, TextLink, TopBar, Txt } from "@/ui/components";

const RESEND_SECONDS = 60;
const CODE_LENGTH = 6;

function useCountdown() {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const id = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  return { left, start: () => setLeft(RESEND_SECONDS) };
}

export default function PhoneSignIn() {
  const { isSignedIn, sendPhoneOtp, confirmPhoneOtp } = useAuth();
  const [country, setCountry] = useState(() => Localization.getLocales()[0]?.regionCode ?? DEFAULT_COUNTRY_ISO2);
  const [number, setNumber] = useState("");
  const [fullNumber, setFullNumber] = useState("");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<"send" | "verify" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { left, start } = useCountdown();
  // A code can only be confirmed once: typing the 6th digit verifies
  // automatically, so a tap on Verify (or SMS autofill) must not send it again.
  const verifying = useRef(false);

  if (isSignedIn) return <Redirect href="/" />;

  const send = async () => {
    setError(null);
    const parsed = parsePhoneNumberFromString(number, country as never);
    if (!parsed?.isValid()) {
      setError("That doesn’t look like a valid number for this country.");
      return;
    }
    setBusy("send");
    try {
      const result = await sendPhoneOtp(parsed.number);
      setConfirmation(result);
      setFullNumber(parsed.formatInternational());
      setCode("");
      start();
    } catch (err) {
      setError(firebaseErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const verify = async (value = code) => {
    if (!confirmation || value.length !== CODE_LENGTH || verifying.current) return;
    verifying.current = true;
    setError(null);
    setBusy("verify");
    try {
      await confirmPhoneOtp(confirmation, value);
      // The auth listener takes it from here; the tabs gate routes onward.
    } catch (err) {
      console.warn("Phone OTP confirm failed", (err as { code?: string })?.code, err);
      setError(firebaseErrorMessage(err));
      setBusy(null);
    } finally {
      verifying.current = false;
    }
  };

  if (confirmation) {
    return (
      <Screen keyboard>
        <TopBar onLeft={() => { setConfirmation(null); setError(null); }} />
        <Txt variant="title" size={32}>
          Enter the <Txt variant="title" size={32} color="accent">code</Txt>
        </Txt>
        <Txt>
          Sent to {fullNumber} ·{" "}
          <Txt color="accent" onPress={() => { setConfirmation(null); setError(null); }}>Edit</Txt>
        </Txt>
        <OtpInput
          value={code}
          autoFocus
          length={CODE_LENGTH}
          onChange={(v) => {
            setCode(v);
            if (v.length === CODE_LENGTH) verify(v);
          }}
        />
        {left > 0 ? (
          <Txt variant="strong" color="muted">Resend in 0:{String(left).padStart(2, "0")}</Txt>
        ) : (
          <TextLink title="Resend code" onPress={send} style={{ textAlign: "left", paddingVertical: 0 }} />
        )}
        {error ? <Txt color="danger">{error}</Txt> : null}
        <View style={{ flex: 1 }} />
        <Button title="Verify" onPress={() => verify()} disabled={code.length !== CODE_LENGTH} loading={busy === "verify"} />
      </Screen>
    );
  }

  return (
    <Screen keyboard>
      <TopBar />
      <Txt variant="title" size={32}>
        What’s your <Txt variant="title" size={32} color="accent">number?</Txt>
      </Txt>
      <Txt>We’ll text you a 6-digit code.</Txt>
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <CountryCodeSelect value={country} onChange={setCountry} />
        <View style={{ flex: 1 }}>
          <TextField
            value={number}
            onChangeText={setNumber}
            placeholder="Mobile number"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            autoFocus
            accessibilityLabel="Mobile number"
          />
        </View>
      </View>
      {error ? <Txt color="danger">{error}</Txt> : null}
      <View style={{ flex: 1 }} />
      <Button title="Send code" onPress={send} loading={busy === "send"} disabled={!number.trim()} />
      <Txt variant="caption" center>Standard SMS rates may apply.</Txt>
    </Screen>
  );
}
