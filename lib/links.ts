import * as WebBrowser from "expo-web-browser";
import { Linking, Platform } from "react-native";

export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL || "https://videofy.co.in").replace(/\/$/, "");
export const SUPPORT_EMAIL = "support@videofy.co.in";
export const ANDROID_PACKAGE = "com.videofy.app";

const q = (s: string) => encodeURIComponent(s);

export function openInApp(url: string) {
  return WebBrowser.openBrowserAsync(url).catch(() => Linking.openURL(url));
}

export const openTerms = () => openInApp(`${WEB_URL}/terms`);
export const openPrivacy = () => openInApp(`${WEB_URL}/privacy`);
export const openWebSearch = (query: string) => openInApp(`https://www.google.com/search?q=${q(query)}`);
export const openTrailer = (title: string, year?: number | null) =>
  Linking.openURL(`https://www.youtube.com/results?search_query=${q(`${title} ${year ?? ""} trailer`.trim())}`);

// Opens the platform's own search for the title where we know its URL;
// otherwise falls back to a web search.
export function openWatch(platform: string, title: string) {
  const p = platform.toLowerCase();
  const url =
    p.includes("netflix") ? `https://www.netflix.com/search?q=${q(title)}`
    : p.includes("prime") || p.includes("amazon") ? `https://www.primevideo.com/search?phrase=${q(title)}`
    : p.includes("hotstar") || p.includes("jio") ? `https://www.hotstar.com/in/search?q=${q(title)}`
    : p.includes("youtube") ? `https://www.youtube.com/results?search_query=${q(title)}`
    : p.includes("zee5") ? `https://www.zee5.com/search?q=${q(title)}`
    : p.includes("sony") ? `https://www.sonyliv.com/search?searchTerm=${q(title)}`
    : `https://www.google.com/search?q=${q(`watch ${title} on ${platform}`)}`;
  return Linking.openURL(url);
}

export function emailSupport(subject: string, body = "") {
  return Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${q(subject)}&body=${q(body)}`);
}

export function openStoreListing() {
  if (Platform.OS === "android") {
    return Linking.openURL(`market://details?id=${ANDROID_PACKAGE}`).catch(() =>
      Linking.openURL(`https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`),
    );
  }
  return Linking.openURL(process.env.EXPO_PUBLIC_APP_STORE_URL || "https://apps.apple.com");
}
