import { getAuth } from "@react-native-firebase/auth";

// @react-native-firebase auto-initializes the default app from
// google-services.json (Android) / GoogleService-Info.plist (iOS) — no
// explicit config object needed, unlike the plain "firebase" JS SDK.
export const auth = getAuth();
