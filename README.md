# dsh-550c-skin

**给 DeepSeek Harness（DSH）换一套 550C 控制台皮肤。**
四套磷光配色（琥珀/绿/青/白）、扫描线与暗角、等宽字体、方块光标，
对话框里还站着一枚像素 **550C**——和 [`dsh-550c-boot`](https://github.com/yannicksong0106/dsh-550c-boot) 的开机片头是同一台机器。
*The 550C console skin for DSH: four phosphor schemes, CRT atmosphere, a pixel mark in the composer, no layout changes.*

> **状态：本地验证中，尚未发布。** 还没建仓库、没发 npm；目前只在 `web` profile 上实测过。
> 见 [验证](docs/VERIFICATION.md)。

![琥珀](.verify/shots/style-amber-02.png)
![青磷光](.verify/shots/style-cyan.png)

---

## 它是什么

一套**只改外观**的 DSH 皮肤。开机片头把机器启动起来，这套皮肤让**启动完之后你还坐在同一台机器前面**。

设计参照是 eDEX-UI 那种「把终端装进一台仪器」的调性——仪器面板的描边与角标、字符格进度条、被字距拉开的全大写标签、闪烁的方块光标、`CRC32` 式的固件脚注——但**配色、字体与字形词汇全部取自那颗 550C 的磷光屏**，而不是 eDEX 的青蓝。

## 硬约束：不改布局

这是这套皮肤最重要的一条约定，也是它和大多数「重做界面」的区别：

> **它只回答「看起来怎样」，从不回答「在哪里」。**

任何 DSH 自己的元素上都不设 `padding`、`margin`、尺寸、`display`、`flex` 或偏移，所以外壳完全按 DSH 作者排好的方式组合，每个控件的命中区域与几何都保持原样。改动只发生在颜色、字体、描边、圆角、辉光，以及一组**绝对定位的装饰**上——装饰不参与布局计算。

这条约定是**验证过的**，不是声称的：`tools/scenarios/rects.js` 会量出外壳里 17 个地标（侧栏、中栏、输入区、输入框、hero、占位符……）的包围盒，开关皮肤各跑一次再逐字节比对。详见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。

开发过程中正是这条检查抓到了两个真问题：

| 症状 | 根因 | 修正 |
|---|---|---|
| 输入框区域高了 2px，周围整体位移 | 给 `[data-composer-card]` 加了 `border`。**边框属于盒模型**，会让盒子在两个方向上各长出一个边框宽度 | 一律改用 `box-shadow: inset 0 0 0 1px` 画同样的线，零布局影响 |
| 中栏内容窄了 2px | `::-webkit-scrollbar{width:10px}`。滚动条**厚度也是布局属性**，而 DSH 的滚动容器是 `overflow:auto` | 只保留滚动条的颜色与外观，厚度交给平台 |

## 安装

> **状态：本地验证中。** 这个包还没有发布到 npm，也没有对应的 GitHub 仓库，所以下面只有本地安装这一条路。
> 发布之后再补 npm 与 GitHub 两种装法。

开发/试用就从本地目录装（`link:` 会直接指向工作目录，改完重建 + 硬刷新即生效）：

```sh
# 装进你正在用的那个 profile（下面是 web profile）
dsh plugin --profile web add link:<本目录绝对路径>

# 例如
dsh plugin --profile web add link:F:/项目/dsh-550c-skin
```

装完**必须重启一次 DSH**（bundle 在启动时装配）。之后改了 `src/`，跑 `npm run build` 重建，
再按 **Ctrl+Shift+R** 硬刷新——DSH 的客户端 bundle 带 `max-age=31536000, immutable`，
普通 F5 会继续用第一次抓到的副本。

卸载：

```sh
dsh plugin --profile web remove dsh-550c-skin
```

## 使用

开关在 **设置 → 通用 → 550C 皮肤**，三种档位：

| 行 | 可选 | 说明 |
|---|---|---|
| **550C 皮肤** | 关闭 / 白 / 琥珀 / 绿 / 青 | 选配色即开启（**白是默认**，也是列表第一项）。`关闭` 回到 DSH 深色主题 |
| **CRT 气氛** | 全部 / 仅扫描线 / 仅暗角 / 关闭 | 扫描线、暗角、磷光辉光与极轻的闪烁 |
| **控制台外观** | 550C 标志 开/关、等宽 开/关 | 对话框里的像素标志；以及动画那套 `Cascadia Mono + NSimSun` |

四套配色的取值直接来自片头动画的原稿（`dsh-550c-boot` 的 `assets/550C-source.html` 与它 `src/enhance.js` 里的配色块），
所以片头结束、界面接手时不会有任何色相跳变：

| 方案 | 底色 | 主色 | 正文 |
|---|---|---|---|
| **琥珀**（对应片头默认） | `#050403` | `#e8a020` | `#d8c090` |
| 绿 | `#010601` | `#4ad46a` | `#8fe0a4` |
| 青 | `#010608` | `#3fc8dc` | `#8fd4e2` |
| 白 | `#010101` | `#c9c9c9` | `#c0c0c0` |

配色也注册进了 DSH 官方的主题系统，所以 **设置 → 通用 → 外观** 里同样能选到它们。皮肤的选择存在
`$DSH_HOME/550c-skin-state.json`（不是 localStorage——见下）。

## 它是怎么做到的

三层，从下往上：

### 1. token 阶梯（颜色）

DSH 的 `--dsw-*` token 阶梯是官方留的口子：整套界面都从它取色，重映射它等于重映射整个客户端。
`src/palettes.js` 把 134 个 token 从每套方案的约 20 个原色推出来——表面用底色与主色混合，
墨色沿一条从正文走到暗部的坡道，状态色直接复用片头的红与绿。

阶梯写进**样式表**而不是 `<body>` 的内联属性，这一点是踩过坑才定下来的：`ui-layout` 的
`ThemePresenter` 拥有 `<body>` 的内联自定义属性，每次 `theme/change` 都会先删掉它上次写的那一批。
而 DSH 的主题偏好是**封闭**的（只有 `light | dark | system`），作用域每次更新都会把第三方主题倒回内置值，
于是「我写内联 → presenter 认领 → 回弹时被删光」这个循环会让界面呈现出**皮肤自己的规则对了、DSH 组件还是原色**
的状态——像到足以让人误判。作用域样式表没有这些语义，没人会来收走它。

### 2. 风格层（CSS）

`src/skin.css` 里的每条规则都挂在 `html[data-550c]` 下，而这个属性只在皮肤开启时存在：
所以「关掉皮肤」不需要卸载任何东西，也不会有残留。

### 3. CRT 覆盖层（一个节点）

一个 `pointer-events:none` 的覆盖层承载扫描线、暗角、扫描滚带、磷光辉光与阶梯式闪烁。
它在上（`z-index` 2147480000）但不挡点击，且刻意排在开机片头（2147482000）**下面**，
这样在有皮肤的界面上播片头时画面依然干净。

### 为什么偏好要存在宿主侧

DSH Desktop 每次启动都从**随机回环端口**提供界面，而浏览器存储是按 origin（含端口）隔离的——
localStorage 每次都是空的。所以真正的记录放在 `$DSH_HOME/550c-skin-state.json`，
由宿主半边的同源路由 `/dsh-550c-skin/state` 读写，localStorage 只作为首帧的同步缓存。

## 工程结构

```
src/palettes.js    四套方案 + token 阶梯 + 皮肤设计 token（纯函数，可单测）
src/skin.css       风格层：全部挂在 html[data-550c] 下
src/crt.js         CRT 覆盖层
src/client.js      浏览器半边：注册主题、施加阶梯、设置行、持久状态
lib/index.js       宿主半边：持久状态路由
scripts/build.mjs  把手写源码拼成 lib/client.js（无打包器、无构建依赖）
tools/             取证与截图工具（见下）
```

## 验证

```sh
npm run build     # 拼接 lib/client.js + 语法检查
npm test          # 纯 node 单测：调色板、阶梯完整性
npm run geometry  # 需要跑着的 dsh web：开关皮肤各量一次几何并比对
```

`tools/` 里的东西都是真取证用的，不是摆设：

| 工具 | 用途 |
|---|---|
| `tools/shoot.mjs` | CDP 驱动真实浏览器：按精确时刻截图、跑场景脚本、读回页面状态、捕获异常 |
| `tools/scenarios/rects.js` | 量 17 个地标的包围盒 + 祖先链的盒模型数字（定位布局漂移） |
| `tools/scenarios/ladder.js` | 分辨「阶梯落上了」和「只是我自己的 CSS 看着对」 |
| `tools/scenarios/offenders.js` | 扫出仍然偏离配色的元素（按色相判定） |
| `tools/scenarios/residue.js` | 关掉之后逐项确认零残留 |
| `tools/scenarios/settings-rows.js` | 端到端驱动设置行，并走一次「点关闭」的实时拆除路径 |
| `tools/scenarios/frames.js` | 量展开项目时的真实帧间隔与 longtask（用掉帧数把卡顿定位到具体图层） |
| `tools/scenarios/real-effect.js` | 证明变阻器真的改了应用的推理等级，且开局读数等于应用档位 |
| `tools/scenarios/effort-absent.js` | 上游不提供思考强度时，变阻器确实下岗（不适用 / 不可拖） |
| `tools/check-palette.mjs` | 不起浏览器就检查阶梯生成（134 项、无空值、无 NaN） |

## 兼容与限制

- **DSH 版本要求 `>=0.2.0-rc.1`**（`package.json#dsh.engines`）。
- 类名选择器用的是 CSS-module 的**局部名**（`[class*="_composerSeat"]`）。前面的 hash 会随 DSH 构建变化，
  局部名不会——但 DSH 若要改组件文件名，仍需要跟着更新选择器。
- 少数图标是内嵌 SVG 的固有色（工作区文件夹图标等），不吃 token，无法换色。
- 等宽开着时，文本度量会变，个别按字宽定尺寸的容器会有 1–2px 的差异——这是换字体本身的含义，
  不是布局改动；关掉「等宽」即回到逐字节一致。
- 关闭皮肤时配色交还给 `prefs.builtin`（默认深色），因为 DSH 的偏好本身只记 `light/dark/system`。

## 文档

| 文档 | 内容 |
|---|---|
| [docs/VERIFICATION.md](docs/VERIFICATION.md) | 验证方法与实测结论：几何契约、阶梯落点、零残留、设置行端到端 |
| [docs/DESIGN.md](docs/DESIGN.md) | 设计说明：配色推导、字形词汇、CRT 参数与可读性取舍 |

## 致谢

550C 片头动画与配色原稿由 **Voidpoket**（[@Voidpoket](https://github.com/Voidpoket)）提供，
皮肤工程与移植由 **Ziyang Song**（[@yannicksong0106](https://github.com/yannicksong0106)）完成。
视觉参照 [eDEX-UI](https://github.com/GitSquared/edex-ui)（仪器面板的调性）。

[MIT](LICENSE) © 2026 Ziyang Song
