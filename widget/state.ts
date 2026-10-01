import AsyncStorage from "@react-native-async-storage/async-storage";
import React from "react";
import { Platform } from "react-native";
import { ScanWidget } from "./ScanWidget";

const KEY = "@videofy/widget-scans-left";

export async function readWidgetScansLeft(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(KEY).catch(() => null);
  return raw === null ? null : Number(raw);
}

// Called by the app whenever the balance changes, so the widget stays current.
export async function updateScanWidget(scansLeft: number | null): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    if (scansLeft === null) await AsyncStorage.removeItem(KEY);
    else await AsyncStorage.setItem(KEY, String(scansLeft));
    const { requestWidgetUpdate } = await import("react-native-android-widget");
    await requestWidgetUpdate({ widgetName: "Scan", renderWidget: () => React.createElement(ScanWidget, { scansLeft }) });
  } catch {
    /* no widget placed, or not supported on this device */
  }
}
