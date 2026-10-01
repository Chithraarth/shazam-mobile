import React from "react";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { ScanWidget } from "./ScanWidget";
import { readWidgetScansLeft } from "./state";

// Runs headless when Android asks the widget to draw (added, resized, timed update).
export async function widgetTaskHandler({ widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === "WIDGET_DELETED") return;
  renderWidget(<ScanWidget scansLeft={await readWidgetScansLeft()} />);
}
