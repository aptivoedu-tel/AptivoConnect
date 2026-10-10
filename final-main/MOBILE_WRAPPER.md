# Aptivo Mobile Wrapper

## Architecture

`aptivo-mobile/` is a thin Expo + React Native WebView shell. The existing Next.js portal remains the single product surface and source of truth. There are no native dashboard, university, practice, exam, profile, or authentication screens.

The wrapper loads `EXPO_PUBLIC_APTIVO_URL`; that configured origin is the only internal WebView origin. The wrapper opens external HTTPS, `mailto:`, and `tel:` links with the operating system and blocks `javascript:`, `file:`, malformed, and arbitrary custom-scheme navigation.

## Project structure

- `aptivo-mobile/app/index.tsx` — WebView shell, native lifecycle, deep links, push taps, Android Back, and initial connection error state.
- `aptivo-mobile/app.json` — Aptivo identity, scheme, Android/iOS identifiers, notification channel, splash, and asset references.
- `components/providers/NativeAppBridge.tsx` — minimal, validated web-to-native bridge.
- `app/api/mobile/push/devices/route.ts` — server-session-bound push device registration.
- `lib/mongodb/models/MobilePushDevice.ts` — multi-device installation model.
- `lib/services/expoPushService.ts` — best-effort Expo delivery after the normal Aptivo notification is persisted.

## Environment

Create `aptivo-mobile/.env` from `aptivo-mobile/.env.example`:

```env
EXPO_PUBLIC_APTIVO_URL=https://www.aptivo.tech
```

Only use a local `http://localhost` URL in local development. Production must use HTTPS. `EXPO_PUBLIC_*` values are visible to clients and must contain no secret.

Optionally configure `EXPO_PUSH_ACCESS_TOKEN` on the **web server only** for Expo Push Service enhanced security. It must never be exposed in `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` configuration.

## Local development

```bash
cd aptivo-mobile
npm install
npx expo install --fix
copy .env.example .env
npx expo start
```

For a physical device, `EXPO_PUBLIC_APTIVO_URL` must be a reachable HTTPS deployment; a device cannot use the computer's `localhost` as the portal origin.

## WebView, authentication, and logout

The existing Aptivo login, registration, reset-password, verification, and NextAuth redirects stay inside the WebView when they are hosted on the configured Aptivo origin. Cookie storage is enabled with shared cookies, so the existing web session remains authoritative and persists normally.

Google or other third-party provider domains are opened outside the WebView only when the provider requires it. OAuth return configuration and platform app-link association still need to be completed in the relevant provider consoles before release.

Existing Aptivo logout remains authoritative. Before the normal web sign-out runs, the bridge disables only that installation's push device record while the authenticated server session still exists. The wrapper then resets WebView history to prevent Android Back from exposing a stale protected page.

## Android Back, deep links, and links

Android Back uses WebView history when it exists; otherwise it returns control to Android. Deep links use the `aptivo://` scheme and are converted only to safe existing web paths. Push payload paths receive the same validation. Association files for verified HTTPS app links are deployment/provisioning work and are not created by this wrapper.

## Push architecture

After a logged-in WebView reports a valid session, the wrapper asks for notification permission, obtains an Expo token, and sends a minimal bridge message. The web page posts the token and installation ID to `/api/mobile/push/devices`; the server derives the owner from the authenticated session, never from a supplied user ID.

`MobilePushDevice` supports multiple enabled installations per account. The installation ID is held in native secure storage. Registering the same installation after another account signs in reassigns it server-side, so the previous account no longer receives pushes on that installation.

The existing bulk notification flow persists `Notification` and `NotificationRecipient` records first, then performs best-effort Expo delivery to enabled devices. A failed Expo request cannot prevent the Aptivo in-app notification from being saved. `DeviceNotRegistered` Expo tickets disable that token. Payloads carry only a validated existing internal path, defaulting to `/notifications`.

Foreground banners, background taps, and cold-start notification responses navigate the loaded WebView to that path. If the web session has expired, normal portal protection redirects to login; the wrapper does not bypass authorization.

## Uploads, PDFs, safe areas, keyboard, and lifecycle

Standard HTML forms and WebView file inputs remain enabled. The wrapper does not inject CSS, zoom, or alter Aptivo's responsive viewport. The portal owns its own `env(safe-area-inset-*)` behavior; the native shell deliberately adds no duplicate WebView safe-area padding. The native status bar is intentionally light, and no native bottom bar is created.

The WebView is preserved while the app is backgrounded and is not reloaded on resume. The native loading state applies only to first WebView startup. An initial network failure shows a retry screen rather than a raw WebView error. PDF/download handling depends on the existing web response headers and should be tested on both platforms during release QA.

## Production configuration

Before building, replace `REPLACE_WITH_EAS_PROJECT_ID` in `aptivo-mobile/app.json` with the real EAS project ID. Confirm `tech.aptivo.mobile` is available in Apple and Google developer accounts; change it only if your registered identifier differs. The wrapper reuses `public/logo.png`; store-grade raster icon/splash exports should be supplied and substituted before store release.

Android requires an EAS/dev build for real push testing. iOS requires an Apple team, provisioning, an APNs key/certificate configured in Expo/EAS, and a physical device. Configure OAuth provider callback URLs and Android/iOS verified HTTPS app links in their external consoles.

## Validation commands

```bash
# Web project
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js components/providers/NativeAppBridge.tsx app/api/mobile/push/devices/route.ts lib/services/expoPushService.ts

# Mobile project, after npm install
cd aptivo-mobile
npx expo-doctor
npx expo config --type public
```

Real Android/iOS device, push delivery, file chooser, PDF download, OAuth, and store builds require their respective installed toolchains, credentials, deployed HTTPS portal, and physical-device testing.
