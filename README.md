# Shazam Mobile (Videofy)

Standalone Expo (React Native) app: scan with the camera or import a screen recording to identify movies, shows, and viral clips.

## Setup

```bash
npm install
cp .env.example .env   # fill in backend domain and scan pack product ID
npm run dev            # starts Expo; scan the QR with Expo Go
```

`EXPO_PUBLIC_DOMAIN` must point at a running `shazam-backend` instance (the app calls `https://<domain>/api/...`).

## Scripts

- `npm run dev` / `npm start` — start the Expo dev server
- `npm run android` / `npm run ios` / `npm run web` — start on a specific platform
- `npm run typecheck` — TypeScript check

## Structure

- `app/` — Expo Router screens: `(tabs)` (history, scan, me), `welcome` intro, `sign-in/` (method chooser, phone, email, forgot), onboarding + permissions, identifying, result, paywall and purchases, settings/help/about
- `lib/billing.tsx` — Google Play / App Store scan-pack purchases (expo-iap), verified by the backend
- `ui/` — Pulse design system: theme tokens (dark/light), components, tab bar
- `components/` — country picker, vibe pickers, error boundaries
- `lib/api-client/` — typed API client + React Query hooks (formerly `@workspace/api-client-react`)
- `hooks/`, `constants/` — profile hook, colors
