import type { Persistence } from "firebase/auth";

// The `firebase` umbrella package's public types for "firebase/auth" don't
// expose the React Native persistence helper, even though it's present and
// works at runtime (Metro resolves the package's own "react-native"
// conditional export, which does declare it — the gap is only in what the
// umbrella re-export surfaces to TypeScript).
declare module "firebase/auth" {
  export function getReactNativePersistence(storage: unknown): Persistence;
}
