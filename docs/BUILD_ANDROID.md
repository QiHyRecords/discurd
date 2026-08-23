# Building LumaLink for Android

## Current Project

LumaLink is an Expo SDK 54 and React Native 0.81 project with TypeScript. It targets Android from API 24 and produces a native Android build through Expo prebuild and Gradle. The repository contains all source code, assets, SQL migrations, and configuration needed to extend the app independently.

| Requirement | Recommended version |
|---|---:|
| Node.js | 22 LTS |
| pnpm | 9.12 or newer |
| Java | 21 (the generated project has been validated with OpenJDK 21) |
| Android Studio | latest stable with Android SDK Platform 36 |
| Android SDK Build Tools | 36.0.0 |
| Android NDK | 27.1.12297006 (only if Android Studio requests it) |
| Expo / React Native | Expo SDK 54 / React Native 0.81, pinned in `package.json` |

## Development Build

From a clean checkout, install dependencies and confirm the TypeScript and test suites are healthy before generating native Android files.

```bash
pnpm install --frozen-lockfile
# Optionally create .env from docs/ENVIRONMENT_TEMPLATE.md when Supabase is connected.
pnpm check
pnpm test
npx expo prebuild --platform android
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > android/local.properties
cd android
./gradlew assembleDebug
```

On macOS the Android SDK usually lives at `$HOME/Library/Android/sdk`; on Linux it is usually `$HOME/Android/Sdk`; and on Windows use the escaped Android Studio SDK path, for example `sdk.dir=C:\\Users\\YOUR_NAME\\AppData\\Local\\Android\\Sdk`. Confirm that `android/local.properties` points to a real directory before launching Gradle. The file is local-only and must not be committed.

The resulting debug APK is normally at `android/app/build/outputs/apk/debug/app-debug.apk`. Open the generated `android/` folder in Android Studio when you prefer its device manager and signing UI. Do not commit Supabase service-role credentials, Firebase private keys, or release keystores.

## Release Signing

Create and store a release keystore outside version control. Configure Gradle signing credentials through `~/.gradle/gradle.properties` or a local untracked properties file, then produce the release APK.

```bash
keytool -genkeypair -v -keystore lumalink-release.jks -alias lumalink -keyalg RSA -keysize 2048 -validity 10000
cd android
./gradlew assembleRelease
```

For an independently reproducible signed build, create an untracked `android/keystore.properties` file with `storeFile`, `storePassword`, `keyAlias`, and `keyPassword`, then add the corresponding signing config only in your private release branch or CI secret store. Keep the keystore and all passwords out of the repository.

The signed output is normally at `android/app/build/outputs/apk/release/app-release.apk`. For Play Store delivery, build an Android App Bundle with `./gradlew bundleRelease`; follow the internal → closed → open → production testing sequence defined in the product specification.

## Backend Variables

Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` may be present in the mobile environment. They are intentionally public values protected by Supabase Row Level Security. Keep the Supabase service role, Firebase credentials, TURN credentials, CAPTCHAs, and webhook secrets in Edge Function secrets or an equivalent server-only environment.

Apply the migrations in chronological order before connecting the mobile repository:

```bash
supabase db push
supabase functions deploy send-message notify-event redeem-invite request-data-export moderate-report
```

Configure FCM, WebRTC/TURN, CAPTCHA, and any analytics/crash-reporting tokens as server-only secrets. Do not enable the corresponding controls in a production release until their Edge Function authorization checks and RLS tests are passing.

## APK Artifact Note

The managed environment may not provide the Android SDK, Java toolchain, or the memory headroom required to run a Gradle build. When that occurs, this project remains self-buildable using the commands above on a local Android Studio installation or a CI runner with the listed requirements.
