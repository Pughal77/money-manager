# Money Manager

A privacy-first, local-first personal finance application for **iOS, macOS (PWA / Add to Dock), and Desktop Web** built from a single TypeScript monorepo.

Money Manager uses an **iPhone Source-of-Truth** model: your iPhone's local SQLite database is the sole master copy of your financial records. When you sit at your computer, your desktop browser connects directly to an embedded HTTP server running on your iPhone over your local Wi-Fi or Personal Hotspot as a **stateless, memory-only thin client**. No cloud servers, no third-party databases, no tracking, and no subscriptions.

---

## Table of Contents

- [Key Features](#key-features)
- [Codebase Architecture](#codebase-architecture)
  - [Monorepo Structure](#monorepo-structure)
  - [Data Flow & Synchronization](#data-flow--synchronization)
- [Deployment Guide ($0 iOS via SideStore)](#deployment-guide-0-ios-via-sidestore)
  - [Prerequisites](#prerequisites)
  - [Step 1: Set Up SideStore on Your iPhone](#step-1-set-up-sidestore-on-your-iphone)
  - [Step 2: Build the IPA](#step-2-build-the-ipa)
  - [Step 3: Install on iPhone](#step-3-install-on-iphone)
  - [Step 4: Connect Desktop Browser (LAN Thin Client)](#step-4-connect-desktop-browser-lan-thin-client)
- [Local Development & Testing](#local-development--testing)
  - [Prerequisites](#prerequisites-1)
  - [Available Scripts](#available-scripts)
  - [Testing Architecture](#testing-architecture)
- [License](#license)

---

## Key Features

### 1. Privacy-First Local Architecture
- **iPhone Source of Truth**: All financial data is persisted on-device in SQLite (`persister-expo-sqlite`) using TinyBase's `MergeableStore`.
- **Zero Cloud Footprint**: No backend servers, no AWS/Firebase dependencies, and no telemetry or ad trackers.
- **Stateless Web Thin Client**: The desktop web app is served directly by the iPhone over port `8787` and operates entirely in memory (`store.web.ts`). It writes nothing to `localStorage`, `IndexedDB`, or cookies. When you close the tab, nothing remains on your computer.
- **On-Device Access Pairing**: The embedded iPhone server requires manual authorization ("Allow this browser to connect?") before granting access to web clients.

### 2. Intuitive & Responsive Financial UI
- **Pure Dark & Pure Light Themes**: Styled with high-contrast borders, refined typography, and pastel category iconography.
- **Interactive Home Dashboard**:
  - **1-Tap Balance Toggle**: Tapping the monthly balance card instantly flips between **Expense** and **Income** views without navigating away.
  - **Interactive Donut Chart**: Live SVG donut chart representing monthly spending or income breakdown.
  - **Direct Drill-down Link**: Tapping the month summary header or income/expense rows opens the dedicated Monthly Decomposition page.
  - **Day-Grouped Transactions**: Clean transaction list grouped by date with category icons, subcategory labels, account tags, and color-coded amounts.
- **Dedicated Monthly Decomposition View (`/breakdown`)**:
  - Segmented toggle to switch between **Expense** and **Income**.
  - Interactive Donut chart drill-down.
  - Category list displaying absolute amounts and percentage share in brackets: `e.g. $1,250.00 (42.5%)`.
  - Visual proportional progress bars for each category.
  - Subcategory drill-down showing exact spending per subcategory.
- **7-Column Calendar View**:
  - Monthly calendar grid showing daily income (green) and expense (red) totals.
  - Tap any day to inspect all transactions recorded on that date.
- **Statistic Tab**:
  - Period-based breakdown with category ranking and direct 1-tap navigation to the decomposition screen.
- **Account Management & Income Linkage**:
  - Multi-account tracking: Checking, Savings, Cash, Credit Card, Investment.
  - Explicit account attribution: Income transactions are tied to a destination account (**"Deposit to"**), while expenses specify the funding source (**"Pay from"**).
  - Real-time balance calculations across all accounts.
- **Streamlined Transaction Entry (`/transaction/new`)**:
  - Segmented switcher: **Expense | Income | Transfer**.
  - **Integrated Calculator Keypad**: Built-in `+`, `−`, `×`, `÷`, `=` arithmetic keypad with real-time evaluation.
  - **Two-Stage Category & Subcategory Picker**: Tapping a parent category immediately reveals an intuitive 1-tap subcategory grid.
  - **Custom Inline Calendar Dialog**: Quick month/day selection with presets for Today and Yesterday.
  - Notes and memo input.
- **Data Portability**:
  - Full CSV export and import packaged into a standard ZIP archive.
  - Choice between **Merge** (CRDT-based conflict-free union) and **Replace** restore strategies.

---

## Codebase Architecture

The project is structured as a TypeScript monorepo with clean separation between pure domain logic, networking protocols, synchronization, and the Expo application layer.

```
money-manager/
├── packages/
│   ├── core/           # Pure domain models, TinyBase schemas, money math, actions, CSV ZIP
│   ├── http-lite/      # Streaming HTTP/1.1 parser, router, and browser pairing approval state machine
│   └── sync/           # CRDT sync protocol, Hybrid Logical Clock (HLC), delta push/pull
├── apps/
│   ├── app/            # Expo Router application (iOS native app + embedded Web SPA)
│   └── phone-sim/      # Node-based headless simulator for TCP server & SQLite sync E2E tests
├── scripts/
│   ├── build-sidestore-ipa.sh  # Script to compile unsigned Release IPA for SideStore
│   └── embed-web.ts            # Bundles web client assets into native TypeScript string map
└── .github/
    └── workflows/
        ├── ci.yml              # Node 26 CI test and typecheck pipeline
        └── build-ios-ipa.yml   # GitHub Actions cloud builder for SideStore IPA (free macOS runner)
```

### Monorepo Structure

| Package / App | Purpose | Key Files |
| :--- | :--- | :--- |
| **`@mm/core`** | Domain logic, schema, queries, integer-cent money math, actions, CSV export/import | [`schema.ts`](packages/core/src/schema.ts), [`money.ts`](packages/core/src/money.ts), [`actions.ts`](packages/core/src/actions.ts), [`queries.ts`](packages/core/src/queries.ts), [`csv.ts`](packages/core/src/csv.ts), [`calculator.ts`](packages/core/src/calculator.ts) |
| **`@mm/http-lite`** | Streaming HTTP/1.1 parser, TCP request routing, security pairing handshake | [`parser.ts`](packages/http-lite/src/parser.ts), [`router.ts`](packages/http-lite/src/router.ts), [`approval.ts`](packages/http-lite/src/approval.ts) |
| **`@mm/sync`** | TinyBase `MergeableStore` CRDT sync engine, HLC clock synchronization, batch event delivery | [`protocol.ts`](packages/sync/src/protocol.ts), [`sync.ts`](packages/sync/src/sync.ts) |
| **`@mm/app`** | Cross-platform Expo Router frontend, native SQLite persister, and native TCP server | [`app/(tabs)/index.tsx`](apps/app/app/(tabs)/index.tsx), [`app/breakdown.tsx`](apps/app/app/breakdown.tsx), [`src/platform/store.native.ts`](apps/app/src/platform/store.native.ts), [`src/server/lanServer.native.ts`](apps/app/src/server/lanServer.native.ts) |
| **`@mm/phone-sim`**| Headless Node simulator replicating the iPhone TCP server and SQLite database for automated testing | [`src/index.ts`](apps/phone-sim/src/index.ts), [`src/sim.test.ts`](apps/phone-sim/src/sim.test.ts) |

### Data Flow & Synchronization

```
+--------------------------------------------------------------------------+
|                               iPhone Master                              |
|                                                                          |
|  +--------------------+     CRDT Updates     +------------------------+  |
|  |   iOS Native UI    | <------------------> | TinyBase MergeableStore |  |
|  +--------------------+                      +------------------------+  |
|                                                          |               |
|                                                    SQLite Persister      |
|                                                          v               |
|                                              [money-manager-vault.db]    |
|                                                          ^               |
|                                                          |               |
|  +-------------------------------------------------------+------------+  |
|  | Native LAN TCP Server (react-native-tcp-socket, Port 8787)         |  |
|  | - GET /                -> Serves embedded production Web SPA       |  |
|  | - GET /api/sync/snapshot -> Delivers full initial state snapshot   |  |
|  | - POST /api/sync/push  -> Receives web changes (CRDT HLC merge)   |  |
|  | - Security Guard       -> "Allow this browser?" pairing approval   |  |
|  +-------------------------------------------------------+------------+  |
+----------------------------------------------------------|---------------+
                                                           | Local Wi-Fi / Hotspot
                                                           v
+--------------------------------------------------------------------------+
|                       Desktop Browser (Thin Client)                      |
|                                                                          |
|  +--------------------+     CRDT Push/Pull    +-----------------------+  |
|  |  React Web App UI  | <-------------------> | TinyBase (In-Memory)  |  |
|  +--------------------+                       +-----------------------+  |
|                                                          |               |
|                   Zero Disk Persistence <----------------+               |
|           (No localStorage, No IndexedDB, No Cookies)                    |
+--------------------------------------------------------------------------+
```

---

## Deployment Guide ($0 iOS via SideStore)

You can build and run Money Manager on your personal iPhone **completely free ($0)** without paying for a \$99/year Apple Developer account. This is accomplished using **[SideStore](https://sidestore.io/)**, an on-device sideloading utility that signs applications using your free personal Apple ID and refreshes certificates automatically over Wi-Fi via a local WireGuard loopback profile.

### Prerequisites
- An iPhone running iOS 14 or later.
- A free personal Apple ID.
- Access to [SideStore Documentation](https://docs.sidestore.io/).

---

### Step 1: Set Up SideStore on Your iPhone

If you do not already have SideStore installed:
1. Follow the official [SideStore Getting Started Guide](https://docs.sidestore.io/getting-started/).
2. Enable Developer Mode on your iPhone:
   - Go to **Settings → Privacy & Security → Developer Mode** and switch it **On**. Restart your phone when prompted.
3. Install **SideServer** on a Mac or Windows PC once to install SideStore onto your phone and generate your device pairing file.
4. Install the recommended WireGuard / StosVPN local loopback VPN profile as outlined in the SideStore documentation. This allows SideStore to refresh the 7-day personal certificate directly on your device without needing a computer.
5. Launch SideStore on your iPhone and sign in with your free Apple ID.

---

### Step 2: Build the IPA

You can build `MoneyManager-SideStore.ipa` using either GitHub Actions (no Mac needed) or locally on macOS:

#### Method A: Cloud Build via GitHub Actions (Recommended — No Mac Required)
1. Push your repository to GitHub.
2. In your GitHub repository, navigate to the **Actions** tab.
3. Select the **Build SideStore iOS IPA** workflow ([`.github/workflows/build-ios-ipa.yml`](.github/workflows/build-ios-ipa.yml)).
4. Click **Run workflow**.
5. Once the job completes, download the **`MoneyManager-SideStore-IPA`** artifact from the run summary and extract `MoneyManager-SideStore.ipa`.

#### Method B: Local Build on macOS
If you have a Mac with Xcode and Node.js 26+ installed:
```bash
npm install
npm run build:ipa
```
This runs [`scripts/build-sidestore-ipa.sh`](scripts/build-sidestore-ipa.sh), which:
1. Bundles the production web client and embeds it into [`apps/app/src/server/webAssets.ts`](apps/app/src/server/webAssets.ts).
2. Runs `npx expo prebuild --platform ios` to generate the native iOS project.
3. Compiles the Release `.app` bundle via `xcodebuild` with `CODE_SIGNING_ALLOWED=NO`.
4. Packages the unsigned binary into `MoneyManager-SideStore.ipa` in the repository root.

---

### Step 3: Install on iPhone

1. Transfer `MoneyManager-SideStore.ipa` to your iPhone (via AirDrop, iCloud Drive, or the Files app).
2. Open **SideStore** on your iPhone.
3. Go to the **My Apps** tab and tap the **`+`** icon in the upper corner.
4. Select `MoneyManager-SideStore.ipa`.
5. SideStore will sign the application with your free Apple ID and install it to your Home Screen.

---

### Step 4: Connect Desktop Browser (LAN Thin Client)

1. Launch **Money Manager** on your iPhone.
2. Open the **Sync & Backup** tab (or Settings).
3. Tap **Start Direct iPhone Server (Port 8787)**. Note the local URL displayed (e.g., `http://192.168.1.50:8787` or `http://172.20.10.1:8787` if on Personal Hotspot).
4. Connect your desktop/laptop computer to the **same Wi-Fi network** (or connect directly to your iPhone's **Personal Hotspot**).
5. Open the displayed URL in Chrome, Safari, or Edge.
6. A security prompt will appear on your iPhone: **"Allow this browser to connect?"**. Tap **Allow**.
7. Your desktop browser will load the full Money Manager interface. All changes sync in real-time back to your phone.
8. *(Optional on macOS)*: In Safari, select **File → Add to Dock...** to install Money Manager as a standalone desktop app.

---

## Local Development & Testing

### Prerequisites
- **Node.js**: `>= 26.0.0`
- **npm**: `>= 12.0.0`

### Available Scripts

| Command | Description |
| :--- | :--- |
| `npm install` | Install all dependencies across monorepo workspaces |
| `npm test` | Run all unit, property-based, and TCP simulation tests with Vitest |
| `npm run test:watch` | Run Vitest in interactive watch mode |
| `npm run typecheck` | Run `tsc --noEmit` across all packages and apps |
| `npm run build:web-embed` | Export production web UI and embed it into the native app's asset dictionary |
| `npm run build:ipa` | Build unsigned iOS `.ipa` for SideStore (macOS with Xcode) |
| `npm run web` | Start the Expo Web development server |
| `npm run ios` | Start Expo for iOS development |
| `npm run sim` | Run the standalone `@mm/phone-sim` headless server |
| `npm run bridge` | Run phone simulator in bridge mode |

### Testing Architecture

The codebase includes comprehensive test coverage across four test suites:
1. **`packages/core/src/core.test.ts`**: Verifies integer-cent money math, transaction creation, account balance queries, subcategory attribution, and CSV ZIP backup/restore logic.
2. **`packages/http-lite/src/http-lite.test.ts`**: Tests streaming HTTP/1.1 chunked request parsing, security approval state machine, and route handlers.
3. **`packages/sync/src/sync.test.ts`**: Validates CRDT synchronization, Hybrid Logical Clock (HLC) merges, snapshot exchange, and offline event queues.
4. **`apps/phone-sim/src/sim.test.ts`**: Runs end-to-end integration tests over real TCP sockets against a simulated phone server.

Run the test suite anytime with:
```bash
npm test
```

---

## Useful References & Links

- [SideStore Official Website](https://sidestore.io/)
- [SideStore Documentation & Setup Guide](https://docs.sidestore.io/)
- [SideStore Getting Started](https://docs.sidestore.io/getting-started/)
- [TinyBase Documentation](https://tinybase.org/)
- [Expo Documentation](https://docs.expo.dev/)

---

## License

MIT
