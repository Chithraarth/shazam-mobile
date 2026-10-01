import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { useProfile } from "@/hooks/useProfile";
import { useDeleteAccountRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { firebaseErrorMessage } from "@/lib/auth-errors";
import { useHistory, wipeLocalHistory } from "@/lib/history-store";
import { Button, Card, Checkbox, Divider, HeroIcon, ListRow, Screen, TopBar, Txt } from "@/ui/components";

// Screen 38. Deletes server data first, then the Firebase account, then
// anything left on this phone.
export default function DeleteAccount() {
  const router = useRouter();
  const { user, deleteAccount, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { items } = useHistory();
  const requestDeletion = useDeleteAccountRequest();
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    if (!user) return;
    setError(null);
    setBusy(true);
    const uid = user.uid;
    try {
      await requestDeletion();
      await wipeLocalHistory(uid);
      try {
        await deleteAccount();
      } catch (err) {
        // Firebase refuses if the sign-in is old. Server data is already gone,
        // so signing out leaves nothing behind but an empty login.
        if ((err as { code?: string })?.code !== "auth/requires-recent-login") throw err;
        await signOut();
      }
      router.replace("/sign-in");
    } catch (err) {
      setError(firebaseErrorMessage(err) ?? (err instanceof Error ? err.message : "Couldn’t delete your account."));
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <TopBar />
      <HeroIcon icon="trash-outline" variant="danger" size={76} />
      <Txt variant="title">Delete your account?</Txt>
      <Txt>This is permanent. We’ll erase:</Txt>
      <Card>
        <ListRow title={`${items.length} scans & your history`} />
        <Divider />
        <ListRow title="Your vibe & settings" />
        <Divider />
        <ListRow title={`${profile?.scansRemaining ?? 0} unused scans — not refundable`} danger />
      </Card>
      <Txt variant="caption">Purchase records are kept as required by law.</Txt>
      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: understood }} onPress={() => setUnderstood((u) => !u)} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <Checkbox checked={understood} />
        <Txt variant="strong" style={{ flex: 1 }}>I understand this is permanent</Txt>
      </Pressable>
      {error ? <Txt color="danger">{error}</Txt> : null}
      <View style={{ flex: 1 }} />
      <Button title="Delete my account" variant="danger" onPress={remove} loading={busy} disabled={!understood} />
      <Button title="Keep my account" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
