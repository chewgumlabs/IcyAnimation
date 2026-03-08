# IcyAnimation 1.0.1

Release date: 2026-03-08

## Highlights

- Added a Chromebook-specific installable web app distribution.
- Added a one-command Chromebook preview server for local testing.
- Switched Chromebook-friendly save/export flows toward real save dialogs instead of relying on browser downloads.
- Improved GIF export reliability with retries and validation before save.
- Added offline app-shell support and install metadata for the Chromebook build.

## Included Artifacts

- macOS arm64: DMG and ZIP
- Windows x64: EXE installer and ZIP
- Windows arm64: EXE installer and ZIP
- Chromebook: installable static app in `dist/chromebook`

## Notes

- The macOS build is ad-hoc signed and not notarized.
- The Chromebook build should be hosted over `https://` or `http://127.0.0.1` / `http://localhost` for install testing.
