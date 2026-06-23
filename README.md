# Treadmill Master

A React Native (Expo) app to run unlimited custom treadmill workout programs — inspired by FitShow, without the one-custom-program limit.

## MVP features

- **Dashboard** — workout history and aggregate stats
- **Programs** — preset + unlimited custom programs, editor, JSON import
- **Workout** — live segment progress, treadmill state, start/pause/stop

Each program is made of **segments** with:

- `durationSeconds`
- `speedKmh`
- `inclinePercent`

## Quick start (simulator / Expo Go)

```bash
npm install
npm run ios     # or: npm run android
```

Simulator and Expo Go use **mock treadmill** mode. Programs, workouts, and SQLite all work — but no real BLE.

## Real treadmill (development build on iPhone)

BLE requires a **custom dev build** (not Expo Go). The app icon on your phone should say **Treadmill Master** — not **Expo Go**.

```bash
npm install
npx expo prebuild          # once, or after app.json / native plugin changes
npm run ios:device         # builds & installs on connected iPhone (Xcode signing required)
npm run start:dev          # Metro for the dev client — use this, not `expo start`
```

**Important:** After install, open the **Treadmill Master** app from your home screen. Do not scan the QR code with Expo Go — that always runs mock mode.

On the **Workout** tab: **Scan & connect** → pick your treadmill → start workout. Status should show **BLE**, not **Mock**.

### Troubleshooting mock mode on a real phone

| Symptom                                             | Fix                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------- |
| Scan shows "Mock Treadmill (simulator)"             | You opened **Expo Go** instead of the dev build app                   |
| Workout tab says "Expo Go has no BLE native module" | Same — install via `npm run ios:device` and open **Treadmill Master** |
| Says "BLE native module missing"                    | Rebuild: `npm run ios:device` (native module not linked)              |
| Still mock after rebuild                            | Run `npm run start:dev`, not `npm start`                              |

Mock mode is used only when: web, Expo Go, missing native BLE module, or `EXPO_PUBLIC_USE_MOCK_TREADMILL=true`.

### BLE stack (2026)

- `react-native-ble-plx@3.5.1` — FTMS scan, connect, control
- `expo-dev-client` — development build
- Mock mode when: Expo Go, web, no native BLE module, or `EXPO_PUBLIC_USE_MOCK_TREADMILL=true`

FitShow-compatible treadmills usually speak **FTMS** (service `0x1826`). Commands are rate-limited to ~1/sec. If your treadmill does not respond, it may use a proprietary protocol — report the device model to add support.

## JSON import

Use **Programs → Import JSON**. See `data/sample-import.json` for the expected format:

```json
{
  "programs": [
    {
      "name": "My Program",
      "segments": [
        {
          "durationSeconds": 300,
          "speedKmh": 5.5,
          "inclinePercent": 2
        }
      ]
    }
  ]
}
```

## Roadmap (your goals)

| Feature                    | Status       | Notes                                              |
| -------------------------- | ------------ | -------------------------------------------------- |
| Unlimited custom programs  | ✅ MVP       | SQLite persistence (`expo-sqlite`)                 |
| FTMS / FitShow BLE control | ✅ Dev build | `services/ble/ftms-controller.ts`                  |
| Movie-friendly glance UI   | 🔜           | iOS Live Activity / notification area              |
| Apple Watch companion      | 🔜           | Separate watchOS target                            |
| Apple Health export        | 🔜           | `react-native-health` stub in `services/health.ts` |

### Treadmill connectivity

Implementation lives in `services/ble/`:

- `ftms-controller.ts` — BLE scan, connect, FTMS control point writes
- `ftms-protocol.ts` — speed/incline commands, treadmill data parsing
- `services/treadmill/` — picks BLE on real device, mock elsewhere

### Apple Health

`services/health.ts` is ready to wire to `react-native-health` on iOS. Workouts are saved locally today and will sync to Health when the native module is added.

## Data storage

All app data lives in a local **SQLite** database (`treadmill.db`) via `expo-sqlite`:

| Table      | Contents                             |
| ---------- | ------------------------------------ |
| `programs` | Program metadata                     |
| `segments` | Duration, speed, incline per program |
| `sessions` | Completed workout history            |

SQLite is the standard on mobile (iOS and Android ship it; most apps use it or something built on it). Preset programs are seeded into the database on first launch.

## Project structure

```
app/(tabs)/          # Dashboard, Programs, Workout screens
app/program/[id].tsx # Program editor
components/          # UI building blocks
data/                # Preset programs + import sample
services/            # Database, BLE/FTMS, treadmill, health
store/               # Zustand app state
types/               # Shared TypeScript types
```

## Development build

```bash
npx expo prebuild
npm run ios:device
npm run start:dev
```

Rebuild native app after changing `app.json` plugins or BLE permissions.
