import { getShareExtensionKey } from "expo-share-intent";

// The iOS share extension opens the app with a special URL. Send it to the
// home route; ShareIntentHandler then picks up the shared image.
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (path.includes(`dataUrl=${getShareExtensionKey()}`)) return "/";
    return path;
  } catch {
    return "/";
  }
}
