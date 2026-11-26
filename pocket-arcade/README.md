# 口袋街机 Pocket Arcade

基于 React、Vite、TypeScript、Tailwind CSS 与 Capacitor 的离线 Android 小游戏合集。包含大厅、全局主题和音效设置、统一导航，以及可玩的 2048 无限撤销版。贪吃蛇、俄罗斯方块和数独提供交互预览。

项目结构、变量说明和新游戏接入示例见 [开发者指引](docs/DEVELOPER_GUIDE.md)。

## 2048 无限撤销版

滑动棋盘，或用方向键和 WASD 移动方块。每次有效移动可通过「撤销」按钮或 Ctrl+Z 回退，最高分独立保存。达成 2048 后可继续，棋盘无法移动后可撤销或用顶部按钮重开。

游戏会自动保存棋盘、当前得分和撤销记录，返回大厅或关闭应用后，可在重新进入 2048 时接着玩。手动点击「重新开始」会开新局并保留最高分。同源浏览器中的旧版最高分会并入本地纪录。仓库根目录的单文件版依然可以独立运行。

## 本地开发

使用 Node.js 20.19+ 或 22.12+。

```sh
npm ci
npm run dev
npm run build
```

`npm run build` 校验 TypeScript 并生成 `dist/`。字体、插图、图标和脚本均随构建产物提供。音效由 Web Audio API 合成，偏好、最高分和关卡进度由 `localStorage` 保存。

## Android 构建

准备 Android Studio 或 Android SDK 命令行工具、JDK 21 与 Android SDK Platform 35，并接受 SDK 许可。Gradle 会按需下载 Build Tools。通过 `ANDROID_HOME` 或 Android Studio 配置 SDK 路径。

```sh
npm ci
npm run android:apk
```

调试 APK 生成于 `android/app/build/outputs/apk/debug/app-debug.apk`。首次构建需要下载 npm 和 Gradle 依赖，应用运行时使用 APK 内的资源。Android 工程锁定竖屏；系统返回键在游戏页返回大厅。

也可以运行 `npm run android:sync` 同步资源，再用 `npm run android:open` 在 Android Studio 中打开。Windows 命令行可在同步后进入 `android` 目录运行 `gradlew.bat assembleDebug`。

## 目录

```text
src/
├── App.tsx              # 游戏容器、路由、主题与音效设置
├── components/         # 大厅与统一顶部导航
├── games/
│   ├── types.ts        # GameModule 与 GameProps
│   ├── registry.ts     # 游戏注册表
│   └── *.tsx           # 游戏组件与共用占位页
├── services/           # 本地存储、音效合成、导航
└── assets/             # 本地像素插图
android/                # Capacitor Android 工程
public/licenses/        # 随应用分发的依赖许可
```

## 注册新游戏

编写接收 `GameProps` 的组件，并在 `src/games/registry.ts` 中导入组件和本地图标、加入一条注册项。使用稳定且唯一的 `id` 保持已有存档可读。大厅会自动生成入口。

```tsx
{ id: 'new-game', title: '新游戏', description: '简要说明玩法', icon: Gamepad2, component: NewGame, hasLevels: false, category: '街机' },
```

可选的 `artwork` 接受本地图片导入，省略时卡片使用 `icon`。可选的 `color` 支持 `amber`、`green`、`blue` 和 `purple`。关卡型游戏将 `hasLevels` 设为 `true`。

组件可通过 `storage.getHighScore()` 和 `storage.saveHighScore(score)` 读取或刷新纪录，通过 `storage.completeLevel(level)` 和 `storage.getCompletedLevels()` 管理从 1 开始的通关编号，并用 `getSetting(key, fallback)` 和 `setSetting(key, value)` 保存游戏设置。调用 `playSound('click')` 等方法时，合成器会遵循全局音效开关。

顶部的重新开始按钮会在重新挂载组件前调用注册项可选的 `clearSavedRound`，供游戏清除本局存档。若玩法使用计时器、动画帧或监听器，在 React effect 的清理函数中释放资源。
