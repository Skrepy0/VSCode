# VS Code for Android

[🌐|中文](./docs/zh-cn/README.md)

> VSCode for Android with Termux — A native wrapper for running VS Code on Android devices via Termux

This project is a Capacitor-based Android app that loads a [code-server](https://github.com/coder/code-server) instance running inside Termux in a full-screen WebView, letting you use the full VS Code editing experience on Android devices.

**Requires Termux and code-server to use VS Code on Android devices.**

![Platform](https://img.shields.io/badge/platform-Android-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

---

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Daily Use](#daily-use)
- [Build and Install](#build-and-install)
- [FAQ](#faq)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [License](#license)

---

## Features

- **Full-screen immersive experience** — Hides the status bar and automatically adapts to custom ROMs such as ColorOS
- **Auto login** — Automatically completes code-server login after opening the app, with no manual password entry
- **Clipboard support** — Seamless interoperability between the native Android clipboard and the VS Code editor
- **Back button handling** — Double-tap Back minimizes the app (without exiting); single tap is passed to the editor
- **Script injection** — Supports built-in script injection
- **GM_xmlhttpRequest** — Greasemonkey-compatible HTTP request capability, bypassing CORS restrictions

---

## Prerequisites

### 1. Install Termux

Download and install Termux from [here](https://github.com/termux/termux-app).

### 2. Install Dependencies

Open Termux and run the following commands:

```bash
pkg update && pkg upgrade
pkg install nodejs
```

### 3. Install code-server

```bash
npm install -g code-server
```

### 4. Configure code-server

The code-server configuration file is located at `~/.config/code-server/config.yaml`.

A default configuration is generated after the first launch. You need to ensure the following two items match the settings in the app:

```yaml
bind-addr: 127.0.0.1:1145
auth: password
password: 114514191981000
```

> **Important**: The app connects to `http://127.0.0.1:1145` by default, with the default password `114514191981000`.
> If you change the password or port, you need to update the following files accordingly:
>
> | Configuration Item  | File Path                                           | Field                      |
> | ------------------- | --------------------------------------------------- | -------------------------- |
> | Port and password   | Termux `~/.config/code-server/config.yaml`          | `bind-addr` and `password` |
> | Connection address  | `capacitor.config.ts`                               | `server.url`               |
> | iframe address      | `src/views/HomePage.vue`                            | `iframeSrc`                |
> | Auto-login password | `android/app/src/main/assets/scripts/auto-login.js` | `PASSWORD`                 |

#### Custom Configuration Example

If you want to use the custom password `myPassword123` and port `8080`:

**Step 1** — Modify `~/.config/code-server/config.yaml` in Termux:

```yaml
bind-addr: 127.0.0.1:8080
auth: password
password: myPassword123
```

**Step 2** — Modify `capacitor.config.ts`:

```typescript
server: {
  url: 'http://127.0.0.1:8080',
}
```

**Step 3** — Modify `src/views/HomePage.vue`:

```typescript
const iframeSrc = 'http://localhost:8080'
```

**Step 4** — Modify `android/app/src/main/assets/scripts/auto-login.js`:

```javascript
const LOGIN_URL = 'http://127.0.0.1:8080/login'
const ROOT_URL = 'http://127.0.0.1:8080/'
const PASSWORD = 'myPassword123'
```

After making the changes, rebuild the app (see “Build and Install” below).

---

## Daily Use

### Start code-server

Before each use, start code-server in Termux:

```bash
code-server
```

For more configuration options, refer to the [example startup script](./docs/example/start.sh).

If you modified the configuration file, you can also specify the configuration file path:

```bash
code-server --config ~/.config/code-server/config.yaml
```

Output similar to the following indicates successful startup:

```
[2024-01-01T00:00:00.000Z] info  code-server 4.x.x
[2024-01-01T00:00:00.000Z] info  Listening on http://127.0.0.1:1145
```

> **Tip**: Keep Termux running in the background. Pressing `Ctrl+C` stops the service.

### Open the App

After starting code-server, open this app:

1. The app automatically connects to `http://localhost:1145`
2. If it redirects to the login page, `auto-login.js` automatically submits the password to complete login
3. After successful login, you enter the VS Code editor and can start using it

### Back Button Actions

| Action                         | Effect                                                       |
| ------------------------------ | ------------------------------------------------------------ |
| Single tap Back                | Passed to the VS Code editor (for in-editor operations)      |
| Double tap Back (within 800ms) | Minimize the app (app goes to the background, does not exit) |

### Clipboard Usage

The app has built-in clipboard bridging. You can directly use `Ctrl+C` / `Ctrl+V` in VS Code to exchange data with the Android system clipboard.

### Floating Overlay (Overlayer)

The app has a built-in image overlay tool that takes effect automatically after code-server loads:

- **Hotkey to open**: Default `Ctrl+Alt+T` (customizable in settings)
- **Floating button**: Drag to adjust position; automatically snaps to the screen edge
- **Features**: Add/delete layers, set image URL, adjust position/size/opacity/rotation/scale
- **Data persistence**: All settings are saved in `localStorage`

---

## Build and Install

If you need to build the APK from source:

### Environment Requirements

- Node.js 18+
- Android Studio (with Android SDK)

### Build Steps

```bash
# 1. Clone the project
git clone https://github.com/Skrepy0/VSCode.git
cd VSCode

# 2. Install dependencies
npm install

# 3. Build Web assets
npm run build

# 4. Add Android platform (first time)
npm run android:add

# 5. Copy Web assets to the Android project
npm run android:build

# 6. Open Android Studio to compile the APK
npm run android:dev
```

In Android Studio: `Build → Build APK`. The generated APK is located at `android/app/build/outputs/apk/debug/`.

### Common Commands

| Command                 | Description                           |
| ----------------------- | ------------------------------------- |
| `npm run dev`           | Start the development server          |
| `npm run build`         | Type check + build                    |
| `npm run test:unit`     | Run unit tests                        |
| `npm run test:e2e`      | Run E2E tests                         |
| `npm run lint`          | Lint code                             |
| `npm run format`        | Format code                           |
| `npm run android:build` | Build and copy to the Android project |
| `npm run android:dev`   | Build and open Android Studio         |

---

## FAQ

### White Screen / Unable to Connect

**Symptoms**: The app displays “Unable to connect to http://localhost:1145”

**Solution**:

1. Confirm that code-server has been started in Termux
2. Confirm that the port number is 1145 (or your custom port)
3. Confirm that Termux is running in the background (not killed by the system)

### Status Bar Cannot Be Hidden

The app has built-in multiple retry mechanisms (at intervals of 300ms, 800ms, 1500ms, and 3000ms) to address custom ROMs such as ColorOS that forcibly restore the status bar. If it still cannot be hidden, it may be a system limitation.

### Cannot Auto-Login After Changing the Password

Ensure that the password in `config.yaml` in Termux exactly matches `PASSWORD` in `auto-login.js`, then rebuild the app.

### Clipboard Does Not Work

Confirm that the app has clipboard permission (Android Settings → Apps → This app → Permissions).

---

## Project Structure

```
VSCode/
├── index.html                          # Entry HTML
├── src/
│   ├── main.ts                         # Vue app bootstrap
│   ├── App.vue                         # Root component (status bar handling)
│   ├── router/index.ts                 # Vue Router config
│   ├── views/HomePage.vue              # iframe loader (connects to code-server)
│   └── theme/variables.css             # Ionic CSS variables
├── android/                            # Native Android project
│   └── app/src/main/
│       ├── java/com/skrepy/vscode/
│       │   ├── MainActivity.java       # Entry Activity + JS bridge
│       │   └── network/
│       │       ├── GMHttpBridge.java    # GM_xmlhttpRequest bridge
│       │       └── ClipboardBridge.java # Clipboard bridge
│       └── assets/scripts/
│           ├── auto-login.js           # Auto-login script
│           ├── clipboard-polyfill.js   # Clipboard polyfill
│           ├── overlayer.js            # Image overlay
│           └── libs/
│               └── gm-polyfill.js      # GM API polyfill
├── tests/                              # Test files
├── capacitor.config.ts                 # Capacitor config
├── vite.config.ts                      # Vite config
└── package.json                        # Project config
```

---

## Tech Stack

| Category           | Technology                        |
| ------------------ | --------------------------------- |
| Frontend framework | Vue 3.5 + TypeScript              |
| UI framework       | Ionic Vue 9                       |
| Build tool         | Vite 8                            |
| Native runtime     | Capacitor 8.5                     |
| Target platform    | Android (minSdk 24, targetSdk 36) |
| Testing            | Cypress (e2e), Vitest (unit)      |

---

## License

MIT License
