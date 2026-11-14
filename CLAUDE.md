# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

3RDHub Vietnam — the mobile app (iOS + Android, one Expo SDK 58 / React Native / TypeScript codebase) for publishers
of the 3RDHub Vietnam affiliate network. It is a thin client of the existing HUB backend (repo
`lhoaibao1/3rdvn-affiliate-hub`, Go + Nuxt): no backend code lives here. The owner writes in Vietnamese; all UI copy
is Vietnamese; the app name is **"3RDHub Vietnam"** (never "3RDVN Hub").

Read `AGENTS.md` too (Expo rules: check versioned docs before using Expo APIs, `npx expo install` for packages).
Note its template line about routes in `src/app/` is wrong for this repo: routes are in `app/`, shared code in `src/`.

## Commands

```bash
npm install
npx tsc --noEmit        # typecheck: the only automated check (no tests, no lint config)
npm start               # Expo dev server (Expo Go on a phone)
```

There is no test suite. UI is verified by exporting the web build and screenshotting it with Playwright against
mocked `/api/v1` responses (`npm run build:pwa`, serve `dist-pwa/`, mock `**/api/v1/**` on the same origin). The web build cannot render `NativeTabs`, haptics,
biometrics or push, so anything touching those is unverified until the owner tries it on a device — say so.

`npx expo install` / `expo-doctor` may fail in sandboxes without access to `api.expo.dev`; then install with npm at
the versions in `node_modules/expo/bundledNativeModules.json`.

## Release flow (every push ships)

Pushing to `main` or `claude/nifty-wozniak-y6il87` triggers both workflows; there is no staging step, so a push
reaches real users within minutes.

- **iOS** — `.github/workflows/update.yml`: `eas update --branch preview --platform ios`. Testers run the app inside
  **Expo Go** through one fixed link (README.md, `docs/expo-go-qr.png`). Consequences: only libraries bundled in
  Expo Go work on iOS; Face ID falls back to the device passcode there; the home-screen icon/name are Expo Go's.
  Do not change `version` in `app.json` (`runtimeVersion` follows it and the fixed link pins `1.0.0`).
- **Android** — `.github/workflows/android.yml`: `expo prebuild` + Gradle → APK on GitHub Releases (stable link
  `releases/latest/download/3RDHub-Vietnam.apk`). The workflow turns Expo Updates off and bumps `versionCode`; the
  APK is debug-signed (fine for sideloading, not for Play).
- **Web PWA** — `.github/workflows/pwa.yml`: `npm run build:pwa` (`scripts/build-pwa.mjs`: Expo web export +
  manifest / service worker injected into `index.html`) → `3RDHub-Vietnam-pwa.zip` on a non-latest release. It is not
  deployed anywhere; the owner places it behind the HUB nginx (`pwa/README.md`). On web the API base is same-origin
  (`""`), tabs come from `app/(tabs)/_layout.web.tsx`, and `Alert.alert` is replaced by `src/webalert.tsx` (it is a
  no-op in react-native-web). Keep every screen working on web.
- `android/` and `ios/` are generated (never committed). `android-app/` is an abandoned native-Kotlin spec; ignore it.

## Backend contract (the things that bite)

- Base URL: `extra.apiUrl` in `app.json` (currently **Prod** `https://app.3rdvn.io.vn` — real data and money;
  withdrawals and KYC reviews are live actions). Override with `EXPO_PUBLIC_API_URL`. UAT is
  `https://uat-app.3rdvn.io.vn` (no mail/push/OAuth there).
- `src/api.ts` is the only HTTP layer: Bearer token in SecureStore, responses are `{data}` / `{error:{code,message}}`,
  401 outside `/auth/*` signs out. The login token is only returned when the request carries **`X-Client: zalo`**
  (sent on every request; `mobile` exists only on an undeployed backend branch).
- The server decodes JSON with unknown fields disallowed: send exactly the documented keys or get `400 invalid json`.
- Money is integer VND. `commission_rates[].rate_bps` = percent × 100; `amount_minor` is đồng (do not divide).
- Lists are not paged server-side; the app pages client-side (`usePager` in `src/chrome.tsx`).
  `/conversions?limit=` is capped at 50 and is the only form that returns `campaign_name` — the Orders screen
  fetches without `limit` and joins names from `/campaigns` and `/publishers`.
- Permissions come from `GET /tenant/context` (`useCan()` in `src/hooks.ts`); screens for members, clicks, lost
  orders and KYC review hide themselves when the permission is missing (members get 403 otherwise).
- Publisher `status`: `approved` is the normal state, `pending` = waiting, anything else = disabled.
- Images: campaign art is public; avatars and KYC images need the Bearer header (`img()` in `src/api.ts`).
- Google/Microsoft sign-in reuses the backend's Zalo Mini App hand-off (`src/oauth.ts`): open
  `/auth/oauth/{provider}/start?mini=<code>` in a browser and poll `/auth/oauth/mini/<code>`.
- Push: the app registers an Expo token at `POST /tenant/push/expo`, an endpoint that exists only on the HUB branch
  `claude/mobile-push-backend` (not deployed). Until then notifications are local, raised while the app is open.

## Architecture

- **Routing** — Expo Router, files in `app/`. `app/_layout.tsx` is the root: QueryClient, auth gate (redirects to
  `/login` unless on `login|signup|forgot`), brand splash overlay, slow-network bar, prompt host, push/notification
  wiring. The root `Stack` has **no native header**: every pushed screen renders its own `TopBar`
  (`src/chrome.tsx`); tab screens render `LargeTitle` or their own hero.
- **Tabs** — `app/(tabs)/_layout.tsx` uses `NativeTabs` (`expo-router/native-tabs`) with
  `disableAutomaticContentInsets` on every trigger: screens handle insets themselves (top = `useSafeAreaInsets`,
  bottom = `paddingBottom: 110`). Removing that flag doubles the top inset. Icons need both `sf` (iOS) and `md`
  (Android, via `expo-symbols`).
- **Data** — TanStack Query; shared queries, types and status maps live in `src/hooks.ts` (`useOrders`,
  `useCampaigns`, `useMembers`, `useLost`, `useKycAdmin`, `orderStatus`, …). Stale data refetches when the app
  returns to the foreground (`focusManager` in the root layout).
- **Shared UI** — `src/ui.tsx` (Card, Button, Avatar, Art, skeleton `Loading`), `src/detail.tsx` (Hero, InfoGroup,
  InfoRow, StatBar, Timeline: the layout every detail screen uses), `src/chrome.tsx` (TopBar, LargeTitle, Glass,
  Pager, `tap()` haptic), `src/sheet.tsx` (bottom-sheet picker, filter buttons), `src/form.tsx` (Field, Notice).
- **Text** — import `Text`/`TextInput` from `src/text.tsx`, not `react-native`: system font, weight 900 clamped to 800.
- **Pull to refresh** — always `<PullRefresh run={() => Promise.all([q.refetch()])} />` from `src/ui.tsx`. Never bind
  `RefreshControl.refreshing` to `isFetching`: background refetches then leave a stuck spinner gap on iOS.
- **Search** — `src/searchscreen.tsx`, shown as the iOS search tab (`role="search"`) and as `/find` on Android
  (its bottom bar allows 5 items, so the search trigger is hidden there).
- **eKYC** — `app/ekyc.tsx` drives the web eKYC API from the app (handoff → `/ekyc/open` → `X-KYC-Token` →
  challenge → multipart submit). The app does not detect the liveness actions (no face-detection library in Expo
  Go): the person follows prompts and taps; the left/right and portrait photos go to the admin for review.
- **Cross-platform traps** — `Alert.prompt` is iOS-only: use `prompt()` from `src/prompt.tsx`. Persist small
  values through `store` from `src/api.ts` (SecureStore natively, localStorage on web).

## Owner rules settled so far

- Commission is sensitive. Show per-order `publisher_commission` and dashboard figures exactly as the server
  returns them; any sum the app computes must go through `commissionOf` / `countsForCommission` (skips `rejected`
  and `cancelled`) and say that the amount actually received is in the wallet.
- Orders are presented like the web: order value (`sale_amount`) large, commission small; show product
  (`fields.product`), the member's team/region and TL/AM for those who may see members; no decorative icons in rows.
- The logo is the bundled file (`assets/logo.png`, `assets/logo-white.png` on navy). Do not load logos from the
  server (it serves an old mascot) and do not add mascot images.
- Biometric login never prompts on its own; only when the user taps the button.
- Lists get numbered pagination; loading states use skeletons, not blank screens or bare spinners.
- Colours: navy `#0B2A6F`, orange accent `#FF6A2B` (named `gold` in `src/theme.ts` for historical reasons).
