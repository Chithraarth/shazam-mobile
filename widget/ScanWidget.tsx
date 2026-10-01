import React from "react";
import { FlexWidget, TextWidget } from "react-native-android-widget";

// Android home-screen widget (design screen 44). Rendered natively, so it
// uses the widget library's primitives rather than app components.
export function ScanWidget({ scansLeft }: { scansLeft: number | null }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: "shazam-mobile://?action=camera" }}
      style={{
        height: "match_parent",
        width: "match_parent",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 16,
        borderRadius: 28,
        backgroundGradient: { from: "#6A2BFF", to: "#F0600A", orientation: "TL_BR" },
      }}
    >
      <FlexWidget style={{ flexDirection: "row", justifyContent: "space-between", width: "match_parent" }}>
        <TextWidget text="videofy" style={{ fontSize: 13, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFFFFF" }} />
        {scansLeft !== null ? (
          <TextWidget text={`${scansLeft} left`} style={{ fontSize: 12, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#FFFFFF" }} />
        ) : (
          <TextWidget text="" style={{ fontSize: 12 }} />
        )}
      </FlexWidget>
      <TextWidget text="What’s that clip?" style={{ fontSize: 17, fontFamily: "Unbounded_700Bold", color: "#FFFFFF" }} />
      <FlexWidget
        clickAction="OPEN_URI"
        clickActionData={{ uri: "shazam-mobile://?action=camera" }}
        style={{ height: 40, width: "match_parent", borderRadius: 20, backgroundColor: "#FFFFFF", justifyContent: "center", alignItems: "center" }}
      >
        <TextWidget text="Scan now" style={{ fontSize: 14, fontFamily: "PlusJakartaSans_800ExtraBold", color: "#C0106D" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
