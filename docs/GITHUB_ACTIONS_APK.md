# GitHub Actions APK Build

The repository includes [`.github/workflows/android-apk.yml`](../.github/workflows/android-apk.yml). It runs TypeScript and unit-test validation, configures Java 21 and Android API 36 on a GitHub-hosted runner, builds an APK, and uploads it to the workflow run as an artifact.

## Using the Debug APK Workflow

Push the project to a repository whose default development branch is named `main`, or change the `push` and `pull_request` branch filters in the workflow. Every push and pull request to that branch builds the debug artifact. You may also open **Actions → Android APK → Run workflow** to start a run manually.

When the job succeeds, open the completed run and download the **luma-link-debug-apk** artifact. Its APK file is `app-debug.apk`; this is suitable for direct device installation and internal testing, not Play Store distribution.

## Optional Signed Release APK

Use the manual workflow's **Build a signed release APK** option only after adding these repository secrets under **Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `LUMALINK_RELEASE_KEYSTORE_BASE64` | Base64 encoding of your private `.jks` keystore file. |
| `LUMALINK_RELEASE_STORE_PASSWORD` | Keystore password. |
| `LUMALINK_RELEASE_KEY_ALIAS` | Signing-key alias. |
| `LUMALINK_RELEASE_KEY_PASSWORD` | Signing-key password. |

Create the base64 value locally, then copy only the encoded output into the GitHub repository secret. For a local release build, copy `android/keystore.properties.example` to the ignored `android/keystore.properties` file and replace each placeholder:

```bash
base64 -w 0 lumalink-release.jks
```

On macOS, use `base64 -i lumalink-release.jks | tr -d '\n'`. Never commit keystores, passwords, `android/keystore.properties`, `android/local.properties`, or server-side credentials. The workflow creates and deletes temporary signing files only during the protected runner job.

## Repository Checklist

| Item | Required state |
|---|---|
| Android module | Commit the `android/` directory; this project now deliberately tracks it. |
| Lockfile | Commit `pnpm-lock.yaml` so `pnpm install --frozen-lockfile` is reproducible. |
| Public backend values | Add only public `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` if the client is connected. |
| Private service credentials | Keep them in Supabase Edge Function secrets, never GitHub build files or app configuration. |
| Debug build | Requires no signing secrets. |
| Signed release build | Requires all four signing secrets and a manual workflow dispatch. |

The workflow deliberately uses GitHub's fresh Android environment, so it avoids the local sandbox limitation where no Android SDK directory was configured. The APK artifact appears only in the GitHub Actions run selected by the repository owner.
