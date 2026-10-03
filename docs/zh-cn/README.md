# VS Code for Android

> VSCode for Android with Termux — 在安卓设备上通过 Termux 运行 VS Code 的原生包装器

本项目是一个基于 Capacitor 的 Android 应用，通过在全屏 WebView 中加载运行在 Termux 内的 [code-server](https://github.com/coder/code-server) 实例，让你在安卓设备上使用完整的 VS Code 编辑体验。

**需要配合 Termux 和 code-server 在安卓设备上使用 VS Code。**

![Platform](https://img.shields.io/badge/platform-Android-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

---

## 目录

- [功能特性](#功能特性)
- [使用前准备](#使用前准备)
- [日常使用](#日常使用)
- [构建安装](#构建安装)
- [常见问题](#常见问题)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [许可证](#许可证)

---

## 功能特性

- **全屏沉浸式体验** — 隐藏状态栏，自动适配 ColorOS 等定制 ROM
- **自动登录** — 打开 App 后自动完成 code-server 登录，无需手动输入密码
- **剪贴板支持** — 原生 Android 剪贴板与 VS Code 编辑器无缝互通
- **返回键处理** — 双击返回键最小化应用（不退出），单击传递给编辑器
- **脚本注入** — 支持内置脚本注入
- **GM_xmlhttpRequest** — 兼容 Greasemonkey 的 HTTP 请求能力，绕过 CORS 限制

---

## 使用前准备

### 1. 安装 Termux

从 [这里](https://github.com/termux/termux-app) 下载安装 Termux。

### 2. 安装依赖

打开 Termux，执行以下命令：

```bash
pkg update && pkg upgrade
pkg install nodejs
```

### 3. 安装 code-server

```bash
npm install -g code-server
```

### 4. 配置 code-server

code-server 的配置文件位于 `~/.config/code-server/config.yaml`。

首次启动后会生成默认配置，你需要确保以下两项与 App 中的设置一致：

```yaml
bind-addr: 127.0.0.1:1145
auth: password
password: 114514191981000
```

> **重要**：App 默认连接 `http://127.0.0.1:1145`，默认密码为 `114514191981000`。
> 如果你修改了密码或端口，需要同步修改以下文件：
>
> | 配置项       | 文件路径                                            | 字段                      |
> | ------------ | --------------------------------------------------- | ------------------------- |
> | 端口和密码   | Termux `~/.config/code-server/config.yaml`          | `bind-addr` 和 `password` |
> | 连接地址     | `capacitor.config.ts`                               | `server.url`              |
> | iframe 地址  | `src/views/HomePage.vue`                            | `iframeSrc`               |
> | 自动登录密码 | `android/app/src/main/assets/scripts/auto-login.js` | `PASSWORD`                |

#### 自定义配置示例

如果你想使用自定义密码 `myPassword123` 和端口 `8080`：

**Step 1** — 修改 Termux 中的 `~/.config/code-server/config.yaml`：

```yaml
bind-addr: 127.0.0.1:8080
auth: password
password: myPassword123
```

**Step 2** — 修改 `capacitor.config.ts`：

```typescript
server: {
  url: 'http://127.0.0.1:8080',
}
```

**Step 3** — 修改 `src/views/HomePage.vue`：

```typescript
const iframeSrc = 'http://localhost:8080'
```

**Step 4** — 修改 `android/app/src/main/assets/scripts/auto-login.js`：

```javascript
const LOGIN_URL = 'http://127.0.0.1:8080/login'
const ROOT_URL = 'http://127.0.0.1:8080/'
const PASSWORD = 'myPassword123'
```

修改完成后重新构建应用（参见下方「构建安装」）。

---

## 日常使用

### 启动 code-server

每次使用前，需要先在 Termux 中启动 code-server：

```bash
code-server
```

如果你修改了配置文件，也可以指定配置文件路径：

```bash
code-server --config ~/.config/code-server/config.yaml
```

看到类似以下输出表示启动成功：

```
[2024-01-01T00:00:00.000Z] info  code-server 4.x.x
[2024-01-01T00:00:00.000Z] info  Listening on http://127.0.0.1:1145
```

> **提示**：保持 Termux 在后台运行。按 `Ctrl+C` 会停止服务。

### 打开 App

启动 code-server 后，打开本 App：

1. App 会自动连接 `http://localhost:1145`
2. 如果跳转到登录页，`auto-login.js` 会自动提交密码完成登录
3. 登录成功后进入 VS Code 编辑器，开始使用

### 返回键操作

| 操作                   | 效果                                      |
| ---------------------- | ----------------------------------------- |
| 单击返回键             | 传递给 VS Code 编辑器（用于编辑器内操作） |
| 双击返回键（800ms 内） | 最小化应用（App 退到后台，不退出）        |

### 剪贴板使用

App 内置了剪贴板桥接，在 VS Code 中直接使用 `Ctrl+C` / `Ctrl+V` 即可与 Android 系统剪贴板互通。

### 浮窗叠加层 (Overlayer)

App 内置了一个图像浮窗工具，加载 code-server 后自动生效：

- **快捷键呼出**：默认 `Ctrl+Alt+T`（可在设置中自定义）
- **悬浮按钮**：拖动可调整位置，自动吸附到屏幕边缘
- **功能**：添加/删除图层、设置图片 URL、调整位置/大小/透明度/旋转/缩放
- **数据持久化**：所有设置保存在 `localStorage` 中

---

## 构建安装

如果你需要从源码构建 APK：

### 环境要求

- Node.js 18+
- Android Studio（带 Android SDK）

### 构建步骤

```bash
# 1. 克隆项目
git clone https://github.com/Skrepy0/VSCode.git
cd VSCode

# 2. 安装依赖
npm install

# 3. 构建 Web 资源
npm run build

# 4. 添加 Android 平台（首次）
npm run android:add

# 5. 复制 Web 资源到 Android 项目
npm run android:build

# 6. 打开 Android Studio 编译 APK
npm run android:dev
```

在 Android Studio 中：`Build → Build APK`，生成的 APK 位于 `android/app/build/outputs/apk/debug/`。

### 常用命令

| 命令                    | 说明                      |
| ----------------------- | ------------------------- |
| `npm run dev`           | 启动开发服务器            |
| `npm run build`         | 类型检查 + 构建           |
| `npm run test:unit`     | 运行单元测试              |
| `npm run test:e2e`      | 运行 E2E 测试             |
| `npm run lint`          | 代码检查                  |
| `npm run format`        | 代码格式化                |
| `npm run android:build` | 构建并复制到 Android 项目 |
| `npm run android:dev`   | 构建并打开 Android Studio |

---

## 常见问题

### 白屏 / 无法连接

**症状**：App 显示"无法连接到 http://localhost:1145"

**解决**：

1. 确认 Termux 中 code-server 已启动
2. 确认端口号为 1145（或你自定义的端口）
3. 确认 Termux 在后台运行（未被系统杀死）

### 状态栏无法隐藏

App 已内置多重重试机制（300ms、800ms、1500ms、3000ms 间隔），针对 ColorOS 等定制 ROM 会强制恢复状态栏的问题。如果仍然无法隐藏，可能是系统限制。

### 修改密码后无法自动登录

确保 Termux 中 `config.yaml` 的密码与 `auto-login.js` 中的 `PASSWORD` 完全一致，然后重新构建应用。

### 剪贴板不工作

确认 App 已获取剪贴板权限（Android 设置 → 应用 → 本应用 → 权限）。

---

## 项目结构

```
VSCode/
├── index.html                          # 入口 HTML
├── src/
│   ├── main.ts                         # Vue 应用引导
│   ├── App.vue                         # 根组件（状态栏处理）
│   ├── router/index.ts                 # Vue Router 配置
│   ├── views/HomePage.vue              # iframe 加载器（连接 code-server）
│   └── theme/variables.css             # Ionic CSS 变量
├── android/                            # 原生 Android 项目
│   └── app/src/main/
│       ├── java/com/skrepy/vscode/
│       │   ├── MainActivity.java       # 入口 Activity + JS 桥接
│       │   └── network/
│       │       ├── GMHttpBridge.java    # GM_xmlhttpRequest 桥接
│       │       └── ClipboardBridge.java # 剪贴板桥接
│       └── assets/scripts/
│           ├── auto-login.js           # 自动登录脚本
│           ├── clipboard-polyfill.js   # 剪贴板 polyfill
│           ├── overlayer.js            # 图像浮窗叠加层
│           └── libs/
│               └── gm-polyfill.js      # GM API polyfill
├── tests/                              # 测试文件
├── capacitor.config.ts                 # Capacitor 配置
├── vite.config.ts                      # Vite 配置
└── package.json                        # 项目配置
```

---

## 技术栈

| 类别       | 技术                              |
| ---------- | --------------------------------- |
| 前端框架   | Vue 3.5 + TypeScript              |
| UI 框架    | Ionic Vue 9                       |
| 构建工具   | Vite 8                            |
| 原生运行时 | Capacitor 8.5                     |
| 目标平台   | Android (minSdk 24, targetSdk 36) |
| 测试       | Cypress (e2e), Vitest (unit)      |

---

## 许可证

MIT License
