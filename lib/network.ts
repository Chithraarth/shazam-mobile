import NetInfo from "@react-native-community/netinfo";
import { useEffect, useState } from "react";

// True unless the device reports it has no connection. "Unknown" counts as
// online so a flaky probe never blocks scanning.
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => NetInfo.addEventListener((s) => setOnline(s.isConnected !== false)), []);
  return online;
}
