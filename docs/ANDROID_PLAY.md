# Android / Google Play — Bhishi Circle

Web and Android share the same React codebase. The web host (e.g. Vercel) keeps deploying from `npm run build:web`. Android packages the same `dist/` via Capacitor.

## Prerequisites

- Node.js 20+
- [Android Studio](https://developer.android.com/studio) (SDK + platform tools)
- JDK **21** (required by Capacitor 8). Example install: `winget install Microsoft.OpenJDK.21`
- A Google Play Developer account
- `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same as web)

On Windows, point Gradle at JDK 21 before building:

```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

`android/local.properties` should point at your SDK (gitignored), for example:

```
sdk.dir=C:\\Users\\YOU\\AppData\\Local\\Android\\Sdk
```

## Daily workflow

```bash
# Web (unchanged)
npm run build:web

# Android — rebuild web assets into the native project
npm run build:android

# Open Android Studio
npm run cap:open
```

In Android Studio: run on an emulator or USB device (debug).

App id: `com.bhishi.bhishiapp` (same as the live Play listing; v2 of the previous TWA app)

## Signing (live Play key)

Use the **original** keystore from the published app — not a newly generated one.

- File: `android-play.keystore` (copied from `BHISHI APP/android/android.keystore`)
- Alias: `android`
- Config: `android/key.properties` (gitignored)
- Credentials note: `android-play.keystore.credentials.txt` (gitignored)

`versionCode` must always increase for each Play upload (currently **4** / `2.0`).

## Build a Play Store AAB

```bash
npm run build:android
cd android
./gradlew bundleRelease
```

On Windows PowerShell:

```powershell
npm run build:android
cd android
.\gradlew.bat bundleRelease
```

Output:

`android/app/build/outputs/bundle/release/app-release.aab`

## Play Console checklist

1. Create app **Bhishi Circle** (Finance / business tools).
2. Upload the AAB to **Internal testing** first.
3. Store listing: short/long description, screenshots (phone), feature graphic.
4. **Privacy policy** URL (required) — host a page covering Supabase account data, chit/member records.
5. **Data safety**: account email, financial ledger data processed on your servers/Supabase.
6. Content rating questionnaire.
7. Promote Internal → Closed → Production when smoke tests pass.

## Version bumps

Edit `android/app/build.gradle`:

- `versionCode` — integer, must increase every Play upload
- `versionName` — user-visible, e.g. `"1.0.1"`

## Regenerating icons / splash

Replace `resources/icon.png` (1024×1024) and `resources/splash.png`, then:

```bash
npm run assets:android
npm run build:android
```

## Notes

- PDF export on device uses the system share sheet (Filesystem + Share plugins).
- Hardware back closes the side drawer first, then navigates history, then exits.
- iOS can be added later with `npx cap add ios` (Mac required).
