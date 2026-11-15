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
  - Native iOS TCP server (`react-native-tcp-socket` in [`lanServer.native.ts`](apps/app/src/server/lanServer.native.ts)) that serves both the compiled Web App (`GET /`) and the sync endpoints (`/api/*`) directly from your iPhone over Wi-Fi or Personal Hotspot.

---

## Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run all unit, property-based (fast-check), and TCP E2E tests
npm test

# 3. Typecheck all workspaces
npm run typecheck
```

---

## Deploying to Your iPhone with a Free Apple ID + SideStore ($0)

Because **SideStore** signs `.ipa` files directly on your iPhone using your **free personal Apple ID** and automatically refreshes the 7-day certificate over Wi-Fi, you never need a paid ($99/yr) Apple Developer account.

### Step 1: Build `MoneyManager-SideStore.ipa`

You can build the `.ipa` either **locally on your Mac** or **from Linux using GitHub Actions' free macOS runner**:

#### Way A: On Your Mac (One Command)
Make sure Xcode is installed, then from the repository root run:
```bash
npm install
npm run build:ipa
```
This runs [`scripts/build-sidestore-ipa.sh`](scripts/build-sidestore-ipa.sh), which:
1. Compiles and embeds the production Web UI into [`apps/app/src/server/webAssets.ts`](apps/app/src/server/webAssets.ts),
2. Generates the native iOS project (`npx expo prebuild --platform ios`),
3. Compiles the Release iOS `.app` bundle via `xcodebuild` (with `CODE_SIGNING_ALLOWED=NO`, since SideStore signs it on your phone),
4. Outputs **`MoneyManager-SideStore.ipa`** in the repo root.

#### Way B: From Linux via GitHub Actions (No Local Mac Needed)
1. Push this repository to GitHub.
2. In your GitHub repository, open the **Actions** tab → **Build SideStore iOS IPA** ([`.github/workflows/build-ios-ipa.yml`](.github/workflows/build-ios-ipa.yml)) → click **Run workflow**.
3. Download the **`MoneyManager-SideStore-IPA`** artifact once the workflow finishes and unzip it to get `MoneyManager-SideStore.ipa`.

---

### Step 2: Set Up SideStore on Your iPhone (One-Time Setup)

If you don't already have SideStore installed on your iPhone:
1. Follow the official guide at **[sidestore.io](https://sidestore.io)**:
   - Enable **Settings → Privacy & Security → Developer Mode** on your iPhone.
   - Install **SideServer** on your Mac/PC once to sideload the **SideStore** app onto your iPhone and generate your device's pairing file.
   - Install the **StosVPN** (or WireGuard local loopback profile) from the App Store as instructed by SideStore so SideStore can refresh certificates on-device over Wi-Fi without a computer.
   - Sign in to SideStore on your iPhone with your **free Apple ID**.

---

### Step 3: Install Money Manager in SideStore

1. Send **`MoneyManager-SideStore.ipa`** to your iPhone (via AirDrop, iCloud Drive, or a local file transfer) and save it to the **Files** app.
2. Open **SideStore** on your iPhone → go to **My Apps** → tap the **`+`** button in the top-left corner.
3. Select **`MoneyManager-SideStore.ipa`**.
4. SideStore will sign and install **Money Manager** onto your iPhone Home Screen, and automatically refresh its 7-day certificate in the background whenever you're on Wi-Fi.

---

### Step 4: Daily Usage (iPhone + Mac Browser)

1. **On the go**: Open **Money Manager** from your iPhone Home Screen. All data is saved locally in your iPhone's SQLite database (`money-manager-vault.db`).
2. **At your desk (Mac / PC)**:
   - In Money Manager on your iPhone, open the **Sync & Backup** tab and tap **Start Direct iPhone Server (Port 8787)**.
   - Connect your Mac and iPhone to the **same Wi-Fi** (or your **iPhone's Personal Hotspot**, where the phone's IP is `172.20.10.1`).
   - Open the URL displayed on your iPhone (e.g. `http://192.168.1.23:8787` or `http://172.20.10.1:8787`) in Safari or Chrome.
   - Tap **Allow** on the **"Allow this browser to connect?"** prompt on your iPhone.
   - *(Optional on Mac)* Click **Safari → File → Add to Dock...** to create a dedicated macOS Dock icon.
