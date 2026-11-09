# Money Manager (iPhone Source-of-Truth + Memory-Only Web Client)

A single-user personal finance app for **iOS, macOS (PWA / Add to Dock), and Web** built from a single TypeScript monorepo.

## Architecture

- **Layer 1 — UI (`apps/app`)**: Expo Router screens for Dashboard ([`index.tsx`](apps/app/app/(tabs)/index.tsx)), Transactions ([`transactions.tsx`](apps/app/app/(tabs)/transactions.tsx)), New Transaction modal ([`new.tsx`](apps/app/app/transaction/new.tsx)), Monthly Budgets ([`budgets.tsx`](apps/app/app/(tabs)/budgets.tsx)), Accounts ([`accounts.tsx`](apps/app/app/(tabs)/accounts.tsx)), Reports ([`reports.tsx`](apps/app/app/(tabs)/reports.tsx)), and Sync & Backup Settings ([`settings.tsx`](apps/app/app/(tabs)/settings.tsx)).
- **Layer 2 — Domain Logic (`packages/core`)**: TinyBase `MergeableStore` schema ([`schema.ts`](packages/core/src/schema.ts)), integer-cents currency math ([`money.ts`](packages/core/src/money.ts)), queries ([`queries.ts`](packages/core/src/queries.ts)), actions ([`actions.ts`](packages/core/src/actions.ts)), and CSV ZIP backup/restore with a user toggle for **Merge** vs **Replace** ([`csv.ts`](packages/core/src/csv.ts)).
- **Layer 3 — Storage (`apps/app/src/platform`)**:
  - **iPhone ([`store.native.ts`](apps/app/src/platform/store.native.ts))**: Persisted on-device in SQLite via `persister-expo-sqlite` (the master copy / source of truth).
  - **Web ([`store.web.ts`](apps/app/src/platform/store.web.ts))**: Strictly in-memory only. Writes nothing to `localStorage`, `IndexedDB`, or cookies.
- **Layer 4 — Sync Engine (`packages/sync`)**: Built on TinyBase's Hybrid Logical Clock (HLC) CRDT (`MergeableStore`). [`WebSyncController`](packages/sync/src/sync.ts) loads the snapshot on open and pushes changes:
  1. **Asynchronously on every local event** (debounced, non-blocking),
  2. **Immediately** when the **Sync Now** button is clicked,
  3. **On tab hide/close** via `fetch(..., { keepalive: true })` with a `beforeunload` warning if unsynced changes failed to reach the phone.
- **Layer 5 — Local Network Server (`packages/http-lite`, `apps/app/src/server`, `apps/phone-sim`)**:
  - Streaming HTTP/1.1 parser ([`parser.ts`](packages/http-lite/src/parser.ts)), **"Allow this browser?"** phone approval manager ([`approval.ts`](packages/http-lite/src/approval.ts)), and router ([`router.ts`](packages/http-lite/src/router.ts)).
  - Native iOS TCP server using `react-native-tcp-socket` ([`lanServer.native.ts`](apps/app/src/server/lanServer.native.ts)).
  - Node simulator ([`apps/phone-sim/src/index.ts`](apps/phone-sim/src/index.ts)) for running and testing the iPhone server on Linux.

---

## Development & Testing (Linux / macOS)

```bash
# 1. Install dependencies
npm install

# 2. Run all unit, property-based (fast-check), and TCP E2E tests
npm test

# 3. Typecheck all workspaces
npm run typecheck

# 4. Start the iPhone simulator server (listens on http://127.0.0.1:8787)
npm run sim

# 5. In another terminal, start the Expo web app in dev mode
npm run web
```

---

## Building & Deploying

### Step 1: Build & Embed the Production Web App

Before building the iOS app, compile the production web bundle and embed it directly into the iPhone's local network server so your iPhone can serve the web app with zero external hosting:

```bash
npm run build:web-embed
```

What this command does:
1. Runs `expo export -p web` in `apps/app`, producing the static production bundle in `apps/app/dist/`.
2. Runs [`scripts/embed-web.ts`](scripts/embed-web.ts), which packages `apps/app/dist/` into [`apps/app/src/server/webAssets.ts`](apps/app/src/server/webAssets.ts).

*(Optional)* If you only want the standalone static web files in `apps/app/dist/` without regenerating `webAssets.ts`:

```bash
npm run build:web
```

---

### Step 2: Build & Install on Your iPhone

Because the iPhone app hosts a native TCP HTTP server (`react-native-tcp-socket`), it requires a compiled iOS build rather than the generic Expo Go app. Choose either **Option A (Mac + Xcode)** or **Option B (Linux + EAS Cloud Build)**.

#### Option A: Build Locally on a Mac with Xcode (Free)

1. Copy or clone this repository onto your Mac and run:
   ```bash
   npm install
   npm run build:web-embed
   ```
2. Generate the native iOS project (`apps/app/ios`) and install onto your plugged-in iPhone:
   ```bash
   cd apps/app
   npx expo prebuild --platform ios
   npx expo run:ios --device
   ```
3. If prompted in Xcode for code signing:
   - Open `apps/app/ios/*.xcworkspace` in Xcode.
   - Under **Signing & Capabilities → Team**, select your personal Apple ID.
   - On your iPhone, enable **Settings → Privacy & Security → Developer Mode** and trust your developer certificate under **Settings → General → VPN & Device Management**.
   - *(Note: Free Apple ID provisioning profiles expire after 7 days; re-running `npx expo run:ios --device` refreshes the install. A paid Apple Developer account removes the 7-day limit.)*

#### Option B: Build from Linux via Expo Cloud (EAS Build)

If you want to build directly from Linux without a Mac, Expo's cloud builders will compile and sign the iOS `.ipa` (requires an Apple Developer account):

```bash
# 1. Make sure the web bundle is embedded
npm run build:web-embed

# 2. Log in to Expo
npx eas-cli login

# 3. Trigger an internal-distribution iOS build using apps/app/eas.json
cd apps/app
npx eas-cli build --platform ios --profile preview
```

When the build completes, EAS displays a **QR code** in the terminal. Scan it with your iPhone camera to install **Money Manager**.

---

### Step 3: Using the Web App on macOS / PC

1. Open **Money Manager** on your iPhone, go to the **Sync & Backup** tab, and tap **Start Web Access Server (Port 8787)**.
2. Connect your Mac or PC to the **same Wi-Fi network** or your **iPhone's Personal Hotspot** (on Hotspot, the iPhone address is typically `http://172.20.10.1:8787`).
3. Open the URL shown on your iPhone in Safari or Chrome.
4. On your iPhone, tap **Allow** on the **"Allow this browser to connect?"** banner.
5. **Install as a macOS App**:
   - **Safari**: Click **File → Add to Dock...**
   - **Chrome / Brave**: Click ** Menu (⋮) → Cast, save, and share → Install page as app...**
