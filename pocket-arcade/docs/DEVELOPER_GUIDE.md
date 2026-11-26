# 口袋街机开发者指引

口袋街机是一个用 React、TypeScript、Vite 和 Capacitor 构建的离线 Android 小游戏合集。大厅和游戏路由共享同一份注册表。新增游戏时，创建接收 `GameProps` 的组件，再把它加入 `gameRegistry`。修改已有游戏时，从对应的注册项定位组件、存档和样式。

## 本地运行

从仓库根目录进入 `pocket-arcade/`。使用 Node.js 20.19 及以上的 20.x 版本，或 Node.js 22.12 及以上版本。

```sh
cd pocket-arcade
npm ci
npm run dev
```

按终端显示的地址打开大厅。`npm run typecheck` 检查类型，`npm run build` 检查类型并生成 `dist/`，`npm run preview` 预览生产构建。涉及资源加载或离线行为时，用生产构建复查，因为内容安全策略在构建时注入。 [构建脚本](../package.json) · [Vite 配置](../vite.config.ts)

## 项目结构

```text
仓库根目录/
├── index.html                      独立运行的单文件 2048
└── pocket-arcade/                   Android 合集的项目根目录
    ├── index.html                  WebView 与开发服务器使用的 HTML 入口
    ├── src/
    │   ├── main.tsx                挂载 React，引入本地字体和全局样式
    │   ├── App.tsx                 应用状态、路由和游戏生命周期
    │   ├── styles.css              主题、布局和组件共用样式
    │   ├── components/
    │   │   ├── AppHeader.tsx        返回、重开、音效和主题按钮
    │   │   └── Lobby.tsx            读取注册表并生成游戏卡片
    │   ├── games/
    │   │   ├── types.ts            GameModule 与 GameProps
    │   │   ├── registry.ts         游戏注册表
    │   │   ├── Merge2048.tsx       2048 界面与控制器挂载
    │   │   ├── merge2048/          2048 棋盘逻辑、存档和专用样式
    │   │   ├── Sudoku.tsx          数独选关页与游戏入口
    │   │   ├── sudoku/             数独棋盘、输入、计时和通关记录
    │   │   ├── FallingBlocks.tsx   俄罗斯方块棋盘、计分栏和触控界面
    │   │   ├── blocks/             俄罗斯方块规则、计时和自动存档
    │   │   ├── Snake.tsx           贪吃蛇的 Canvas 棋盘、模式与触控界面
    │   │   ├── snake/              贪吃蛇规则、计时、绘制和专用样式
    │   │   └── PlaceholderGame.tsx 共用预览页，供未完成的游戏使用
    │   ├── data/sudokuLevels.ts    数独关卡题库
    │   ├── services/
    │   │   ├── navigation.ts       哈希路由和返回大厅
    │   │   ├── storage.ts          按游戏隔离的本地存储
    │   │   └── audio.ts            Web Audio 音效合成
    │   └── assets/                 随应用打包的插图
    ├── public/licenses/            随应用分发的第三方许可
    ├── docs/                       开发者文档
    ├── scripts/verify-sudoku.mjs   数独题库校验
    ├── vite.config.ts              前端构建、相对路径和离线策略
    ├── capacitor.config.ts         Android WebView 打包配置
    ├── android/                    原生外壳、Gradle、清单和图标
    └── pocket-arcade-debug.apk     仓库分发的调试安装包
```

原生外壳通过 Capacitor 从本地资源加载前端。修改合集里的 2048 时，从 `pocket-arcade/src/games/Merge2048.tsx` 开始。 [合集入口](../src/main.tsx) · [独立 2048](../../index.html)

## 注册接口和应用状态

### GameModule 和 GameProps

注册表的数组顺序决定大厅卡片顺序，当前卡片数量由 `gameRegistry.length` 得出。每项用 `GameModule` 描述，游戏组件接收同一份 `GameProps`。 [接口定义](../src/games/types.ts) · [注册表](../src/games/registry.ts)

| `GameModule` 字段 | 用途 |
| --- | --- |
| `id` | 稳定且唯一的游戏标识。路由、React 组件标识和存档命名空间均依赖它。建议用简短的小写英文和连字符。 |
| `title` | 大厅卡片标题，组件也可直接显示它。 |
| `description` | 大厅卡片上的一句玩法说明。 |
| `icon` | 本地 `lucide-react` 图标组件。没有插图时，大厅用它绘制卡片图案。 |
| `component` | 接收 `GameProps` 的 React 组件。应用匹配路由后会挂载这个组件。 |
| `hasLevels` | 是否为关卡型游戏。共用预览页用它决定是否显示通关数，正式游戏自行实现关卡选择和解锁规则。 |
| `category` | 大厅卡片上的分类名称。 |
| `artwork?` | 卡片插图，可传入从 `src/assets/` 导入的本地文件。 |
| `color?` | 卡片和游戏页的配色，可用 `amber`、`green`、`blue` 或 `purple`。大厅默认用 `purple`。 |
| `clearSavedRound?` | 手动重开时同步清理本局存档。应用在重新挂载组件前调用它。临时状态完全在组件内的游戏可省略。 |

| `GameProps` 字段 | 用途 |
| --- | --- |
| `game` | 当前注册项，组件可读取标题、图标、分类和配色。 |
| `storage` | 已绑定当前 `game.id` 的 `GameStorage` 实例。 |
| `playSound(effect)` | 播放 `SoundEffect` 指定的合成音效，遵循全局音效设置。 |

### 路由和生命周期

1. 大厅的 `onOpenGame(id)` 调用 `openGame(id)`。它写入 `#/games/<id>`，并发出 `hashchange`。应用用 `gameHash(id)` 在注册表中匹配游戏。新注册项会自动出现在大厅，并可以通过对应哈希进入。
2. 回到大厅会卸载游戏组件。导航记录带 `pocketArcadeFromLobby` 时调用浏览器返回，否则跳转到 `lobbyHash`（`#/`）。Android 系统返回键在游戏页回大厅，在大厅退出应用。
3. 点「重新开始」时，应用先调用当前游戏的 `clearSavedRound(storage)`，再递增 `round` 并以新的 React `key` 挂载游戏。游戏组件的初始状态和副作用会重新初始化。 [导航服务](../src/services/navigation.ts) · [应用入口](../src/App.tsx)

| `App.tsx` 变量 | 用途 |
| --- | --- |
| `preferences` | 全局主题和音效开关，从 `StorageService` 初始化，修改后立即保存。 |
| `round` | 手动重开的计数器，构成组件 `key` 的一部分。 |
| `hash` | 当前路由哈希，由 `useSyncExternalStore` 订阅。空哈希或未注册路由会显示大厅。 |
| `game`、`gameId`、`Game` | 当前注册项、它的 ID 和要挂载的组件。 |
| `storage` | 当前游戏的存储接口，按 `gameId` 建立并复用。 |
| `main`、`previousGameId` | 主区域引用和上次渲染的游戏 ID，用于切页后移动焦点并滚回顶部。 |

顶部导航的 `inGame` 控制返回和重开按钮的显示。事件由应用传入，`onBack` 负责导航，`onRestart` 负责重开，`onToggleSound` 和 `onToggleTheme` 分别切换全局设置。 [顶部导航](../src/components/AppHeader.tsx)

### 全局主题和音效

`preferences.theme` 接受 `dark` 或 `light`，默认 `dark`。`applyTheme()` 更新根节点的 `data-theme` 和页面的 `theme-color`。`preferences.soundEnabled` 默认开启，通过 `AudioService.setEnabled()` 同步给音效服务。 [全局样式](../src/styles.css) · [音效服务](../src/services/audio.ts)

| 变量 | 用途 |
| --- | --- |
| `--page`、`--header`、`--surface`、`--raised` | 页面、顶部导航、卡片和凸起交互区域的背景色。 |
| `--ink`、`--subtle`、`--quiet` | 主文字、辅助文字和低强调标签颜色。 |
| `--line`、`--accent`、`--accent-surface`、`--focus` | 分隔边线、强调色、强调面和键盘焦点颜色。 |
| `--shell-width`、`--header-height` | 大厅与导航的内容最大宽度，以及顶部导航的最小高度。俄罗斯方块用导航高度计算底部触控区位置。 |
| `--card-ink`、`--card-light-ink` | 游戏卡片的强调色及浅色主题下的分类文字颜色。 |
| `--card-deep`、`--card-glow`、`--dot` | 游戏插图区的底色、渐变颜色和点阵颜色，由 `data-color` 决定。 |
| `patterns`、`SoundEffect` | 音效名到频率序列的映射及其键名类型。现有音效为 `click`、`merge`、`enter`、`restart`。 |
| `enabled`、`context`、`output` | 音效开关、按需建立的 `AudioContext` 和控制总音量的 `GainNode`。 |

## 存档和关卡

游戏通过 `GameProps.storage` 读写数据。存储服务用 `pocket-arcade:v1` 作为 `prefix`，全局设置使用 `preferencesKey`，每个游戏使用由 ID 生成的 `gameKey`，并把最高分、关卡和自定义设置分别写到 `scoreKey`、`levelsKey` 和 `settingKey(key)`。写入失败时，`temporaryValues` 会在本次应用运行内保留值，关闭应用后需要依赖成功写入的本地存储。 [存储实现](../src/services/storage.ts)

| 接口 | 用途 |
| --- | --- |
| `getHighScore()` | 返回当前游戏的最高分，缺少有效记录时返回 `0`。 |
| `saveHighScore(score)` | 只有更高的有效分数才会保存，返回更新后的最高分。 |
| `getCompletedLevels()` | 返回按数字升序排列、去重的已完成关卡编号。 |
| `completeLevel(level)` | 记录一个从 `1` 开始的整数关卡编号，返回已完成的关卡列表。 |
| `getSetting(key, fallback)` | 读取自定义值，缺失或解析失败时使用 `fallback`。泛型提供编译期类型，游戏负责校验存档内容。已保存的 `null` 会原样返回。 |
| `setSetting(key, value)` | 写入 `JsonValue`，包含字符串、数字、布尔值、`null`、可序列化数组和对象。 |

把本局进度、长期记录和选项存放在各自的字段里。例如用 `round` 保存本局进度，用 `saveHighScore()` 保存纪录。手动重开只清除本局进度。需要续局时，在每次确认操作后保存完整状态，使退出时仍能读取最后一步。复杂存档可带 `version` 字段，修改格式时兼容或迁移已有版本。已发布游戏的 `id` 应保持稳定，以便读取原有存档。

关卡型游戏将 `hasLevels` 设为 `true`，进入页面时读取 `getCompletedLevels()`，确认过关后调用 `completeLevel(level)`。注册表负责入口，关卡数据、通关判断和解锁条件由游戏组件管理。

## 接入新游戏

下面的点按计分游戏演示大厅注册、音效、最高分、退出续局和手动重开。

### 创建游戏组件

在 `src/games/TapScore.tsx` 中写入以下代码。`roundKey` 标识本局进度。每次点按同时更新本局分数和纪录，重开时将本局进度置为 `null`。

```tsx
import { useState } from 'react'
import type { GameStorage, JsonValue } from '../services/storage'
import type { GameProps } from './types'

const roundKey = 'round'

function loadScore(storage: GameStorage) {
  const saved = storage.getSetting<JsonValue>(roundKey, null)
  return typeof saved === 'number' && Number.isSafeInteger(saved) && saved >= 0 ? saved : 0
}

export function clearTapScoreRound(storage: GameStorage) {
  storage.setSetting(roundKey, null)
}

export function TapScore({ game, storage, playSound }: GameProps) {
  const [score, setScore] = useState(() => loadScore(storage))
  const [best, setBest] = useState(() => storage.getHighScore())
  const Icon = game.icon

  function scoreTap() {
    const nextScore = score + 1
    storage.setSetting(roundKey, nextScore)
    setScore(nextScore)
    setBest(storage.saveHighScore(nextScore))
    playSound('click')
  }

  return (
    <section className="game-layout" data-color={game.color} aria-labelledby="tap-score-title">
      <div className="game-heading">
        <div className="game-heading-icon"><Icon size={24} aria-hidden /></div>
        <h1 id="tap-score-title">{game.title}</h1>
      </div>
      <div className="game-stats" aria-label="得分记录">
        <div><span>当前得分</span><strong>{score}</strong></div>
        <div><span>最高分</span><strong>{best}</strong></div>
      </div>
      <button className="preview-button" type="button" onClick={scoreTap}>点按得分</button>
    </section>
  )
}
```

### 注册到大厅

在 `src/games/registry.ts` 加入组件、回调和图标的导入。

```ts
import { MousePointer2 } from 'lucide-react'
import { clearTapScoreRound, TapScore } from './TapScore'
```

保留已有游戏，将这一项加入 `gameRegistry` 数组。位置决定大厅展示顺序。

```ts
export const gameRegistry: readonly GameModule[] = [
  // 已有注册项
  {
    id: 'tap-score',
    title: '点按计分',
    description: '每次点按增加一分',
    icon: MousePointer2,
    component: TapScore,
    clearSavedRound: clearTapScoreRound,
    hasLevels: false,
    category: '计分',
    color: 'green',
  },
]
```

### 验证新模块

运行 `npm run build`，然后在大厅打开「点按计分」。点按两次后，返回大厅再打开同一游戏，当前得分和最高分都应为 `2`。点顶部「重新开始」，当前得分应回到 `0`，最高分仍为 `2`。预览生产构建时也可用 `#/games/tap-score` 直接进入。

正式游戏有计时器、全局监听或动画帧时，在 React effect 的清理函数里取消它们。将游戏专用样式限制在本模块的容器下。可复用 `.game-layout`、`.game-heading`、`.game-stats` 及主题变量，避免样式影响大厅和其他游戏。

## 修改已有功能

| 修改目标 | 源码入口 |
| --- | --- |
| 游戏标题、插图和卡片顺序 | [registry.ts](../src/games/registry.ts) |
| 大厅卡片布局 | [Lobby.tsx](../src/components/Lobby.tsx) |
| 返回和重开逻辑 | [App.tsx](../src/App.tsx) · [navigation.ts](../src/services/navigation.ts) |
| 顶部按钮界面 | [AppHeader.tsx](../src/components/AppHeader.tsx) |
| 主题、间距和响应式布局 | [styles.css](../src/styles.css) |
| 音效音高和节奏 | `patterns` 和 `playNotes()` · [audio.ts](../src/services/audio.ts) |
| 最高分、关卡进度和通用存储格式 | [storage.ts](../src/services/storage.ts) |
| 贪吃蛇方向输入、规则和绘制 | [Snake.tsx](../src/games/Snake.tsx) · [engine.ts](../src/games/snake/engine.ts) · [canvas.ts](../src/games/snake/canvas.ts) |
| 俄罗斯方块棋盘、按钮和样式 | [FallingBlocks.tsx](../src/games/FallingBlocks.tsx) · [blocks.css](../src/games/blocks/blocks.css) |
| 数独选关、填格和计时 | [Sudoku.tsx](../src/games/Sudoku.tsx) · [PlaySudoku.tsx](../src/games/sudoku/PlaySudoku.tsx) · [progress.ts](../src/games/sudoku/progress.ts) |

### 2048 的状态和输入

`Merge2048.tsx` 显示得分、棋盘、撤销和胜负提示。`board.ts` 管理规则、手势、动画和存档。`board.css` 管理棋盘和方块展示。组件用 `useLayoutEffect` 调用 `mount2048()`，在卸载时调用 `dispose()` 以移除监听、取消待执行定时器并清理方块节点。 [界面组件](../src/games/Merge2048.tsx) · [棋盘控制器](../src/games/merge2048/board.ts) · [棋盘样式](../src/games/merge2048/board.css)

| 变量 | 用途 |
| --- | --- |
| `BOARD_SIZE`、`padding`、`gap`、`tileStep` | 棋盘阶数和百分比定位参数。底格和方块共享 `tilePosition(row, column)`，调整尺寸时应一起检查。 |
| `target`、`slideTime` | 胜利阈值 `2048` 和移动动画收尾时间 `120` 毫秒。动画时长应和 `board.css` 对齐。 |
| `vectors`、`keyDirections` | 四个方向在行列坐标中的步长，以及方向键和 WASD 到移动方向的映射。 |
| `cells`、`initialView` | React 界面用到的底格位置和挂载前的初始显示数据。 |
| `board`、`tileLayer`、`controller` | 接收手势的棋盘根节点、方块 DOM 容器、控制器实例。 |
| `grid`、`round`、`history` | 内存棋盘、当前得分与胜负标记、可撤销快照栈。内存棋盘的方块带 DOM 引用，快照中只存数字和状态。 |
| `best`、`moves` | 最高分和本次挂载内的有效移动计数，后者用于给得分动画提供变化的 `key`。 |
| `drag`、`pending` | 当前指针 ID、起点和是否已触发移动，以及待收尾动画的定时器、被吸收方块、合并方块和新方块。 |
| `view`、`onChange` | `view` 是 React 显示用的 `BoardView`，控制器通过 `onChange` 发布它。 |
| `BoardView.score`、`best`、`undoCount` | 当前分数、最高分、可撤销步数。 |
| `BoardView.phase`、`gained`、`moves` | 界面阶段（`playing`、`won`、`over`）、本步新增分和得分动画标识。 |

`resolveMove()` 从移动方向一侧遍历棋盘，用 `merged` 保证每块每步最多合并一次。它返回 `slides`、`absorbed`、`merged` 和 `gained`。只有产生有效变化时，`move()` 才把移动前的快照推入 `history`，增加分数并生成新方块。`hasMoves()` 判断还有没有空格或相邻同值方块，`settle()` 收尾动画并同步方块 DOM。

修改滑动手势时，从 `pointerdown`、`pointermove` 和 `pointerup` 监听入手。`directionForDrag(dx, dy)` 比较水平和垂直位移，优先采用位移较大的轴。`drag.moved` 让同一次手势最多触发一步。

### 2048 的续局和重开

| 存档字段或函数 | 用途 |
| --- | --- |
| `saveKey` | `round`，经过 2048 的存储命名空间后是 `pocket-arcade:v1:game:2048:setting:round`。 |
| `version`、`current`、`history` | 存档格式版本（当前为 `1`）、当前快照、用于跨次进入继续撤销的历史快照。 |
| `Snapshot.grid` | 棋盘数字矩阵，`0` 表示空格。 |
| `Snapshot.round` | 本局的 `score`、是否达成 2048 的 `won`、是否选择继续的 `keepPlaying` 和是否已结束的 `over`。 |
| `readSavedRound()`、`restoreRound()` | 校验存档并恢复棋盘及分数。当前快照无效时开新局，历史无效时恢复当前棋盘并使用空撤销栈。 |
| `saveRound()` | 新开局、有效移动、撤销和点击继续后的持久化入口。有效移动先保存最终棋盘，再等待动画收尾。 |
| `clearSaved2048()` | 注册表传给 `clearSavedRound` 的回调。重开时清空本局存档，最高分沿用独立的最高分键。 |
| `readBest()` | 读取最高分。独立版旧键 `game2048.best` 在同源可读时会并入新纪录。 |

修改规则或存档结构时，检查达成目标后继续、结束后撤销、动画中返回、退出后重新打开，以及手动重开保留最高分。这些流程共用同一组快照和状态字段。

## 新增数独关卡

追加第 6 关或第 7 关时，把对象加入 `sudokuLevels` 数组末尾。选关页按数组顺序显示，前一关通关后解锁下一项，结算页的「下一关」也沿用这个顺序。已有 `levelId` 对应玩家的通关和最佳用时，发布后请保持它与题目对应。 [题库](../src/data/sudokuLevels.ts)

| 字段 | 填写要求 |
| --- | --- |
| `levelId` | 整数 ID，从现有最后一关依次递增，例如 `6`、`7`。 |
| `title` | 显示在关卡卡片和游玩页面上的名称。 |
| `difficulty` | `1` 到 `5` 的整数星级。 |
| `puzzle` | 从左到右、从上到下排列的 81 位数字字符串，`0` 表示空格。 |
| `solution` | 同顺序的 81 位完整答案，每个位置只允许 `1` 到 `9`。 |

下面是第 6 关的对象格式。将两个占位字符串换成本关的实际数字，再把对象追加到数组。

```json
{
  "levelId": 6,
  "title": "新关卡名称",
  "difficulty": 3,
  "puzzle": "此处填写 81 位题面数字",
  "solution": "此处填写 81 位答案数字"
}
```

在 `pocket-arcade/` 运行题库校验。

```sh
npm run verify:sudoku
```

校验脚本独立计算解数，再从题面用逻辑技巧逐步推出答案。它会检查题面、答案、ID 和星级，要求唯一解与录入答案相同。当前星级的逻辑技巧上限依次为显性唯一、隐性唯一、区块排除、显性数对和 X-Wing。 [校验脚本](../scripts/verify-sudoku.mjs)

首次出题参考了 Norvig 公开题库的校验方法和 HoDoKu 的技巧分级。安装包使用随源码提供的原创题库。 [Norvig 数独题库与求解方法](https://www.norvig.com/sudoku.html) · [HoDoKu 推理技巧](https://hodoku.sourceforge.net/en/techniques.php)

游玩时，`givens` 是题目给定值，`values` 是当前棋盘，`notes` 是每格的候选位掩码，`selected` 是选中格的下标。`correctCounts` 按答案统计每个数字正确就位的次数。完成后用 `storage.completeLevel(levelId)` 记录进度，用 `best-time:<levelId>` 记录耗时最短的毫秒值。 [游玩组件](../src/games/sudoku/PlaySudoku.tsx) · [关卡记录](../src/games/sudoku/progress.ts)

## 俄罗斯方块规则和存档

棋盘显示 20 行、10 列，`hiddenRows` 在顶端提供两行旋转空间。`board` 存已锁定的方块，`active` 记录当前方块的种类、朝向和坐标，`queue` 是七袋随机生成的待出块序列。`landingPiece()` 同时用于计算幽灵投影和硬降终点。 [棋盘规则](../src/games/blocks/engine.ts)

| 变量或函数 | 用途 |
| --- | --- |
| `standardKicks`、`longKicks` | SRS 旋转偏移表，其中 `longKicks` 用于 I 块，O 块旋转时占格保持原样。 |
| `lineScores`、`blockLevel()` | 一到四行的固定得分和每十行升一级的规则。 |
| `gravityInterval()`、`fallElapsed` | 普通下落间隔与距离下一次下落的已用毫秒数。 |
| `lockDelay`、`lockElapsed`、`lockResets` | 触底后的 500 毫秒锁定窗口、已用时间和触底调整次数。每块最多因调整重置 15 次。 |
| `held`、`repeatDelay`、`repeatInterval` | 用指针 ID 跟踪长按。左右连续移动的初始延迟为 145 毫秒，重复间隔为 50 毫秒。 |

控制器处理帧更新、按键和后台暂停，把有盘面变化的状态保存到 `blocks` 游戏的 `round` 设置，并在恢复旧局时等待玩家点击「继续游戏」。手动重开通过 `clearSavedBlocks()` 清理本局状态。改动保存结构时更新格式校验并处理旧局兼容性。 [控制器](../src/games/blocks/controller.ts) · [存档](../src/games/blocks/storage.ts)

棋盘的滑动输入在 `FallingBlocks.tsx` 处理。`swipe` 保存指针、起点与锁定的方向，`swipeSteps()` 用棋盘格宽把位移换成步数。横向和向下滑动通过 `moveBy()` 应用移动。硬降由底部按键触发。暂停、指针取消或当前方块锁定后，已有手势随即清除。 [触控界面](../src/games/FallingBlocks.tsx)

## 贪吃蛇规则和输入

`gridSize` 决定 Canvas 正方形网格大小，`body[0]` 是蛇头。`advanceSnake()` 按方向推进一格。在经典模式中越界结束，在穿墙模式中越界时坐标循环到对侧。食物从空格中选取，吃到食物后 `score` 加一，并用 `moveInterval()` 缩短下一步等待时间。 [规则](../src/games/snake/engine.ts)

`turns` 最多缓存两个转向。十字键和画布滑动都调用 `turn()`，由 `canTurn()` 拦截反向输入。每次移动只消耗一个排队方向。暂停时清除计时器和输入队列，继续时基于当前盘面重新计时。模式使用 `snake` 的 `mode` 设置，最高分通过 `GameStorage` 保存。 [控制器](../src/games/snake/controller.ts)

`drawSnake()` 根据画布显示宽度和设备像素比绘制网格、蛇身及食物。盘面变化、容器尺寸变化和主题切换都会重绘。游戏使用单个 Canvas 绘制棋盘。 [绘制](../src/games/snake/canvas.ts)

### 移速和计时

`moveInterval(score)` 根据已吃食物数计算下一步的等待毫秒数。`schedule()` 每移动一步后读取新的分数，并用这个间隔设置下一次计时器，所以吃到食物后从下一步开始加速。 [速度计算](../src/games/snake/engine.ts) · [计时器](../src/games/snake/controller.ts)

| 变量 | 用途 |
| --- | --- |
| `previousStartInterval`、`previousStartSpeed` | 初版的开局间隔为 210 毫秒，基准速度为 `1000 / 210` 格每秒。 |
| `previousSpeed` | 初版在当前分数下的速度，按照 `1000 / Math.max(80, 210 - score * 8)` 换算为格每秒。 |
| `startSpeed` | 当前开局速度，取初版基准速度的一半。 |
| `foodSpeed` | 当前由食物累计增加的速度，取初版当前速度与初版开局速度之差的三分之二。 |

当前速度为 `startSpeed + foodSpeed`，每格间隔为 `1000 / (startSpeed + foodSpeed)`。开局为 420 毫秒，吃到第一个食物后约为 398.93 毫秒。从第 17 个食物起，每格间隔稳定在约 132.63 毫秒，约每秒 7.54 格。经典和穿墙模式共用这一速度曲线。

## Android 打包和离线验证

本地打包使用 JDK 21、Android SDK Platform 35 和项目的 Gradle Wrapper。在 Android Studio 配置 SDK，或将 `ANDROID_HOME` 指向 SDK 目录。从 `pocket-arcade/` 执行以下命令。

```sh
npm run android:apk
```

`android:apk` 先检查类型、构建前端，通过 `cap sync android` 把 `dist/` 同步到 `android/app/src/main/assets/public/`，再执行 `assembleDebug`。产物是 `android/app/build/outputs/apk/debug/app-debug.apk`。Windows 可执行 `npm run android:sync`，再进入 `android/` 执行 `gradlew.bat assembleDebug`。首次安装依赖和构建可能需要网络，安装后的游戏使用包内资源。 [构建说明](../README.md)

| 配置项 | 用途 |
| --- | --- |
| `vite.config.ts` 的 `base` | `./`，让产物通过相对路径引用本地资源。 |
| `contentSecurityPolicy` | 构建阶段注入的内容安全策略。允许加载本地脚本、字体和图片，应用连接请求由 `connect-src 'none'` 禁用。 |
| `capacitor.config.ts` 的 `appId`、`appName`、`webDir` | 应用标识 `app.pocketarcade`、显示名「口袋街机」与构建目录 `dist`。 |
| `appendUserAgent` | 为 WebView 的 User-Agent 追加 `PocketArcade` 标记。 |
| `android.backgroundColor`、`android.adjustMarginsForEdgeToEdge` | WebView 背景色和贴边显示的边距调节方式。 |
| `minSdkVersion`、`compileSdkVersion`、`targetSdkVersion` | Android 原生配置中的最低安装 API（23）、编译 API（35）和目标 API（35）。 |
| `applicationId`、`versionCode`、`versionName` | 原生安装标识、系统比较用的版本号和展示版本号。覆盖安装需匹配应用标识和签名。 |
| `AndroidManifest.xml` 的 `screenOrientation`、`allowBackup` | Activity 锁定竖屏，应用清单关闭 Android 备份。 |

游戏图片、字体和图标随应用构建。接入新模块时，用本地文件导入插图、用 `lucide-react` 导入图标、用 `playSound()` 播放音效。提交前运行 `npm run build` 并验证大厅入口、操作、重开、返回和存档。在 Android 安装包中开启飞行模式复查首次启动及续局，再更新仓库的调试 APK。 [Capacitor 配置](../capacitor.config.ts) · [Android 清单](../android/app/src/main/AndroidManifest.xml)
