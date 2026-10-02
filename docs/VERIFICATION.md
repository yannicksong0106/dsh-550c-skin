# 验证

[← 回到 README](../README.md)

这套皮肤的核心承诺是「**只改外观，不改布局**」。这不是一句声明——下面每一条都是在这台机器上实测出来的，
而且失败的那两次迭代也被记录下来了，因为它们正是这条检查存在的理由。

## 一条命令

```sh
npm test          # 17 项，纯 node，不需要浏览器
npm run geometry  # 需要跑着的 dsh web：开关皮肤各量一次几何并比对
```

## 静态检查（`npm test`）

### 布局契约

`test/layout-contract.test.mjs` 解析 `src/skin.css` 并断言：

| 断言 | 为什么 |
|---|---|
| 任何能碰到 DSH 元素的规则都不得设置布局属性（padding / margin / 尺寸 / display / flex / gap / overflow / 偏移 / font-size / transform …） | 这些属性的任意一个都会让外壳移动 |
| 不得给 DSH 元素**新增边框** | 边框属于盒模型，会让盒子在两个方向各长出一个宽度 |
| 滚动条只能改外观，不能改厚度 | DSH 的滚动容器是 `overflow:auto`，厚度会撑窄内容盒 |
| 每条规则都必须挂在 `html[data-550c]` 下 | 否则关掉皮肤它还在，就是残留 |

绝对定位的伪元素被放行：它们脱离文档流，尺寸与偏移都不影响任何东西。`position:relative`（不带偏移）也放行。

**豁免是被计数、被标记的。** 整套样式表只有一处豁免：输入区的方块光标。它必须 `inline-block` 且有宽度才可见，
因此它是唯一一个**在文本流里**、真的占位的装饰——宽度是一个字形 + 3px，落在占位文字之后，实际不可见，
但它是真例外。所以它在 CSS 里带着 `layout-exempt:` 标记和一段说明，测试断言「恰好一处豁免，且必须是伪元素」。
将来谁想再豁免一条，会是一次显式改动，而不是悄悄放宽检查。

### 调色板

`test/palette.test.mjs` 把配色层当纯函数测（`tokensFor` 不依赖 DOM）：

- 四套方案、id 唯一、注册用的主题 id 唯一
- 每套方案生成 ≥120 项阶梯；每项都是非空字符串，不含 `NaN` / `undefined`
- 必到清单：外壳的表面与墨色（底、层 1/2、浮层、侧栏、正文/次级/三级、边框 1/2、品牌色、主按钮、错误/成功态、气泡、输入区、shiki 关键字与字符串）
- 四套方案确实是四套配色（底色 + 主色不得重复）
- **对比度**：正文色对底色与层 1、次级色对底色，均需通过 WCAG AA（4.5:1）

## 实测几何（`npm run geometry`）

`tools/scenarios/rects.js` 量出外壳里 17 个地标的包围盒，并把输入区到 `#root` 的**祖先链**连盒模型数字一起报回来。
`tools/check-geometry.mjs` 用它跑三次（关闭 / 开启等宽 / 开启原字体）并逐字节比对，跑完自动还原状态文件。

实测结论：

```
landmarks measured: 17
body metrics, skin off: {"scrollW":1600,"scrollH":900,"clientW":1600,"clientH":900}
PASS  skin on (monospace): identical across 17 landmarks
PASS  skin on (proportional font): identical across 17 landmarks
```

地标包含：`#root`、外壳 frame、侧栏列、中栏、右栏、侧栏头部、新会话按钮、工作区区域、列表区、底部区、
设置区、输入区座位、输入卡片、输入编辑器、占位符、hero、标题。页面滚动尺寸也一致（没有多出滚动条）。

### 这条检查抓到的两个真问题

**① 输入框区域高了 2px，周围整体位移**

```
DIFF composerCard   off: {x:497,y:423,w:877,h:114}
                    on : {x:496,y:423,w:877,h:116}
DIFF composerSeat   off: {x:280,y:331,w:1310,h:238}
                    on : {x:280,y:329,w:1308,h:242}
```

根因：给 `[data-composer-card]` 加了 `border: 1px`。边框是盒模型的一部分，盒子因此高 2px、宽 2px，
居中布局把整个输入簇推来推去。修正：一律改用 `box-shadow: inset 0 0 0 1px`——画出**一模一样**的 1px 线，
但完全不参与布局。

**② 中栏内容窄了 2px**

祖先链报告直接指出了层级：

```
  * 1 div.wSkVaW_scrollBody
      stock: {..., "scrollbar":8, "ovf":"auto/auto"}
      skin : {..., "scrollbar":10, "ovf":"auto/auto"}
```

根因：`::-webkit-scrollbar { width: 10px }` 把滚动条从 8px 改成了 10px，而该容器是 `overflow:auto`，
内容盒因此窄 2px。**滚动条厚度是布局属性。** 修正：只保留滚动条的颜色与外观，厚度交给平台。

这两处都不是靠肉眼看出来的——差值只有 1–2px，放在截图里完全看不出。

## 阶梯落点

皮肤的颜色有两条来源，截图分不出来，**误判的代价是**「皮肤看起来对，但 DSH 组件全是原色」：

1. `--dsw-*` 阶梯（改 DSH 自己的组件）
2. 样式表里皮肤自己的 `--c-*` 规则（改皮肤自己的家具）

`tools/scenarios/ladder.js` 把两者分开报。实测（琥珀）：

| 读点 | 关闭皮肤 | 开启皮肤 |
|---|---|---|
| `--dsw-alias-bg-base` | `#151517` | `#050403` |
| `--dsw-specific-sidebar-fill` | `#1b1b1c` | `#080604` |
| `--dsw-alias-label-primary` | `#f9fafb` | `#d8c090` |
| 发送按钮 `background` | `rgb(103,158,254)` 蓝 | `rgb(232,160,32)` 琥珀 |
| 正文实际颜色 | `rgb(249,250,251)` | `rgb(216,192,144)` |

### 为什么阶梯是样式表而不是内联属性

这是踩坑之后才定下来的，值得写下来。`ui-layout` 的 `ThemePresenter` 拥有 `<body>` 的**内联**自定义属性：
每次 `theme/change` 它会先删掉自己上次写的那一批，再写新快照的。而 DSH 的主题偏好是封闭的（只有
`light | dark | system`），设置作用域每次更新都会把第三方主题倒回内置值。于是内联方案的时序是：

1. 本插件往 `<body>` 写 134 个属性；
2. 它请求自己的主题，presenter 应用该快照，并**把这 134 个名字记成自己的**；
3. 作用域回弹到内置主题，presenter 应用内置快照（不带 token），**尽职地把这 134 个全部删掉**。

结果：界面穿着皮肤自己的规则，而 DSH 的每个组件都还是原色。这个状态**像到足以让人误判**——
第一版截图看着「已经好了」，直到把 token 从页面里读回来才发现 `document.body.style.length === 1`。

作用域样式表没有这些语义：没人会来收走它。

## 零残留

`tools/scenarios/residue.js` 在关闭状态下逐项确认：

```
skinStyle:false  ladderStyle:false  crtLayer:false  htmlAttrs:[]
inlineSkinTokenCount:0  bodyInlineTokens:0
darkAttribute:false  colorScheme:"light"
labelPrimary:"#0f1115"  bgBase:"#fff"
```

即：两张样式表、CRT 覆盖层、`<html>` 的四个属性、全部内联设计 token 都不在；深色模式交还给 DSH 自己，
调色板回到 DSH 原色。

## 设置行端到端

`tools/scenarios/settings-rows.js` 真的去点：打开 设置 → 读行 → 点「关闭」→ 再查残留。

```
steps:     ["clicked 设置", "clicked 关闭"]
rows:      3
titles:    ["550C 皮肤", "CRT 气氛", "控制台外观"]
segments:  [["关闭","琥珀","绿","青","白"], ["全部","仅扫描线","仅暗角","关闭"], ["550C 标志","等宽"]]
active:    ["琥珀","全部","550C 标志","等宽"]
after:     {skinStyle:false, ladderStyle:false, crtLayer:false, htmlAttrs:[],
            inlineSkinTokens:0, darkAttribute:true, colorScheme:"dark", bgBase:"#151517"}
```

`after` 里深色模式是 `true`——这是**正确的**：点「关闭」的含义是「交还给 DSH 的主题偏好」，
而这里 `prefs.builtin` 是 `dark`，所以界面回到 DSH 深色，而不是回到浅色。

## 对话框里的 550C 标志

标志住在输入卡片**内部**，而输入卡片的高度由它自己的内容决定——所以这里最需要证明的是「它没有把输入框撑大」。

`tools/scenarios/composer-map.js` 先把卡片内部量出来（找到工具栏 415px 的空档作为落点），
`tools/scenarios/mark-probe.js` 再报出标志的实时状态。实测：

```
=== typing (t=1200ms) ===
  state=''  insideCard=True  logoRows=5  box={"x":867,"y":501,"w":136,"h":26}
  line[is-sys] [550C] 核                      ← 正在逐字打，才到第 6 个字符

=== settled (t=8000ms) ===
  state='settled'  insideCard=True  box={"x":851,"y":501,"w":167,"h":26}
  line[is-ready] SYSTEM READY
```

`insideCard: true` 是量出来的包含判定（标志的包围盒完全落在卡片包围盒内），不是声明。
`npm run geometry` 随后确认 17 个地标依旧逐字节一致——**标志在输入框里，输入框没变大**。

开关两侧：开启 `present: true`，关闭后 `dialogMark: false` 且整套 `clean: true`。

### 这里踩到的一个 bug

等待循环原本把「**尚未挂载**」和「已销毁」当成同一件事：

```js
const dead = () => cancelled || !root.isConnected   // ← 错的
```

输入框在插件 `apply()` 时**还没渲染**，所以 `dead()` 一开始就为真，等待循环瞬间烧完重试次数并提前
`return`，动画永远不启动——而且没有任何报错，表现只是「标志是空的」。
修法是把取消判据收窄成只管**销毁**：连通性交给 MutationObserver 负责。

## 深色标记：一个属性带来的 81 个 token

这一条是**读回真实页面**才发现的，静态检查全绿也没用。

皮肤注册主题时写的是 `colorScheme: 'dark'`，但运行时实测：

```
darkAttr      : { body: false, html: false }
colorScheme   : light
thinkGradient : linear-gradient(180deg, #fff 20.19%, #fff0 100%)   ← 浅色值
```

原因和 token 阶梯是同一个，只是这次躲不掉：`ThemePresenter` 每次 apply 都会收走它上次写的东西，
而深色标记是**属性**——**样式表设不了属性**。token 靠搬进样式表躲过了回弹，深色标记没躲过。

代价比看起来大。DSH 有 **213 个自定义属性只在 `body[data-ds-dark-theme]` 下声明**，标记一丢，
凡是本阶梯没有自己声明的，全部退回浅色值。审计脚本按 token 名对比过：

```
dark-only tokens declared by DSH: 213
  skin covers: 132
  skin MISSES: 81
```

修法不是逐个补 81 个 token，而是**把标记按住**：`holdDarkMode()` 在皮肤开启期间用
MutationObserver 盯着 `<html>` 的 `style` 和 `<body>` 的这个属性，一旦被收走就重新写上；
只在值真的不对时写，所以不会自己触发自己。关闭皮肤时先释放守卫再交还，浅色用户才能拿回浅色。

实测（同一页面，改前 → 改后）：

| 读点 | 改前 | 改后 |
|---|---|---|
| `body[data-ds-dark-theme]` | `false` | `true` |
| `color-scheme` | `light` | `dark` |
| `--dsw-menu-surface-fill` | `#f8f9fa94`（近白 58%） | `rgba(26,26,26,0.97)` |
| `--dsw-menu-backdrop-filter` | `blur(40px) saturate(150%)` | `none` |
| `--dsw-linear-gradient-think` | `#fff` 起头 | `#010101` 起头 |

### 菜单：两个 token，不是一个

菜单发白还有第二个原因，而且是独立的。`MenuSurface.module.css` 给锚定菜单上色用的是
**`--dsw-menu-surface-fill`**，不是 `--dsw-specific-menu`——后者是给大面板用的。皮肤接管了后者、
漏了前者，于是菜单拿到 DSH 的**半透明**填充，再被 40px 模糊 + 150% 饱和度一搅，就成了奶灰色玻璃。

所以菜单的修法有两半：**阶梯里补上 `--dsw-menu-surface-fill`**（约 0.97 不透明的控制台面板色，
模糊也就没有东西可透了），**外加关掉 `--dsw-menu-backdrop-filter`**（控制台是面板不是玻璃，
而且全屏背景模糊每次开菜单都是实打实的开销）。

回归测试钉住了这几项：`test/palette.test.mjs` 断言这些 token 存在、菜单填充 ≥0.9 不透明、
活动标签等于主色、扫光等于亮主色。

### 状态行：一个不存在的类

上一轮为 `深度求索中` 写的规则挂在 `[class*='_turnStatus']` 上。**这个类不存在**——
DSH 里唯一带 `turnStatus` 的是个 JS 函数 `locationTurnStatus`。规则一直没匹配到任何东西。

真实结构是 `div[data-chat-running]`（`RunningStatus` 组件），可见文字在 app 自己的 `TextShimmer` 里：

```jsx
<div className={ChatView_module.running} data-chat-running>
  <span className={visuallyHidden} role="status">深度求索中</span>
  <span className={runningDivider} />
  <span className={runningContent}>
    <RunningWhaleTail />
    <TextShimmer active>{深度求索中，用时 41秒 ···}</TextShimmer>
  </span>
</div>
```

`ChatView_module.running` 自己就写着 `color: var(--dsw-alias-label-deep-diving)`，并把共享扫光
重绑到 `--dsw-alias-label-deep-diving-shimmer`。**所以只要接管这两个 token，整条线就是控制台的磷光，
动效由 app 自己提供**——不需要 `background-clip`、不需要自绘渐变。

之前那版恰恰画蛇添足：用 `--c-text-dim` 搭了个渐变、`color: transparent` 让渐变透出来，
把一条本该是磷光色的线做成了**灰色**、只在光带经过时亮一下。用户的反馈很准确：「太没辨识度了」。

实测（`tools/scenarios/status-readout.js`，白方案）：

```
accent: "#c9c9c9"   activity: "#c9c9c9"   sweep: "#ffffff"   verdict: PASS
```

## 表头 TPS：两个源，一个数

表头原来自己算：测 `[data-chat-flow]` 的字符增长、除以 4、按 2.5 秒滑窗平均。它和输入框下面那行
（`8 轮 15 步 · 234 tok/s`）差一个数量级，用户报了两次。

实测一轮真实运行，找出两个原因，都是**测量对象**的问题：

```
采样 40 次（每 500ms 一次）
  正在流式的窗口        12 / 39
  流式期间字符增长      509 chars/s
  app 报的速率          235 ~ 237 tok/s
  表头同时显示的        41.1 / 62.0 / 19.2 / 15.0 / 18.9 / 17.2
```

1. **除数不对。** `4 字符/token` 是 `dsh-token-meter` 给**上下文定价**用的启发式，按英文/JSON 调的。
   这里实测约 **2.2 字符/token**（509 ÷ 235），中文占多数时它必然低估一半以上。
2. **被等待时间稀释。** 滑窗按**墙上时钟**平均，于是等 provider 的每一秒（工具调用、重试、首 token 之前）
   都算进分母。39 个窗口里只有 12 个在流式，读数因此掉到 40-60。

还有一次更彻底的采样，说明**这两个数根本不是同一个量**：

```
3 秒内，running=true、streaming=false
  flow  +0 字符    think  +0 字符    scroll  +0 字符    body  +0 字符
  app 仍然报 234 tok/s
```

app 那个数是 `decodeTokens / decodeMs`，是**整会话的累计平均**（标签里就写着 `8 轮 15 步`）——
什么都不产出的时候它照样是 234。所以「谁更准」这个问题本身问错了：**两个都不是「此刻多快」**。

### 现在的规则

| 状态 | 表头显示 | 理由 |
|---|---|---|
| 回合进行中 | **app 自己的数**（读 `[data-composer-stats]`） | 两处不可能再不一致；`tok/s` 这个单位在中英两种语言包里都一样，所以按单位匹配是安全的 |
| 回合结束 | `--`、空条、idle | 会话平均不是「此刻」，一条 READY 下面挂着 60% 满的 busy 条，看起来就是机器还在干活 |
| app 那行不在 | 增长率估算，**前缀 `~`** | 估算绝不冒充测量 |

**工作态只由实测增长和 app 的标记驱动，绝不用 app 那个数**——它是会话平均，喂进去会让标志永远停在加载态。
`[data-chat-running]` 现在也进了标记列表：它是整个回合都在的那一行，覆盖「首 token 之前」和「工具在跑」的空档。

实测（`tools/scenarios/tps-meter.js`，注入 app 自己的回合标记）：

```
appRate : 243

resting     value "--"     fill 0%     level idle   state READY   working false
running     value "243.0"  fill 60.8%  level busy   state RUNNING working true
settled     value "--"     fill 0%     level idle   state READY   working false

checks: 6/6 PASS   verdict: PASS
```

另外那次真实运行里的对照：app 报 242，表头显示 `242.0`，**24/24 帧完全一致**。

## 算力荷载变阻器：读数必须来自机器

用户报「这个似乎没用呢」。先证明驱动本身是好的——按键盘一格一格走，同时读**应用自己的**档位标签
（`[class*="_7KE1Ra_triggerEffort"]`，被皮肤隐藏但隐藏节点仍有文字）：

```
start        空载  → app Max      ← 注意这一行
one right    轻载  → app Low
two right    重载  → app High
three right  满载  → app Max
one left     重载  → app High
two left     轻载  → app Low
three left   空载  → app Off
```

驱动没问题：两边四档一一对应（空载=Off、轻载=Low、重载=High、满载=Max），上下都能走。

**问题在第一行**：页面加载时应用其实在 `Max`，而变阻器显示 `空载`——它从 `index = 0` 起步，
**从来没有读过应用**。一个报着机器并不在的档位的控件，读起来就是一个没用的控件。

修法是在已有的 250ms 计时器里搭一次对账（不新开定时器）：读应用自己的标签，映射回四档；
`driving` 期间不对账，驱动结束后 2.5 秒内也不对账——应用标签要几帧才跟上点击，
在那个窗口里对账会读到**旧**档位并把变阻器拽回去，用户会看到「一拖就跳回原位」。

实测：

```
1) 先推到 Max        → console 满载, app Max
2) 全新加载后再读     → console 满载, app Max, aria-valuenow 3, 56/56 格点亮
```

修复前第 2 步会得到 `空载` / `aria-valuenow 0`。

`tools/scenarios/real-effect.js` 原来等 `.c-load-trigger` 并点它开面板——**那个控件已经不存在了**
（变阻器改成常驻），所以它一直卡在等待循环里报 `present: false`。已按当前结构重写，并加上
「开局读数必须等于应用档位」这条断言：

```
checks: 5/5 PASS   verdict: PASS
```

## 桌面端：hash 是按构建变的，本地名不是

桌面端上「明明有变阻器，模型菜单里却还留着推理等级」，而网页端是好的。

原因不在逻辑，在**选择器**。皮肤所有跟应用有关的类名都写成 `[class*="_7KE1Ra_xxx"]`——
`_7KE1Ra` 是**网页端那次构建**的 CSS-module hash。桌面端跑的是另一份构建：

```
桌面 app.asar 里的类映射：
  triggerEffort → wq12jW_triggerEffort
  cell          → LOs-Za_cell
  option        → mAtvLq_option
  menu          → oXE0lW_menu
整个 asar 里 "_7KE1Ra_" 出现 0 次。
```

于是桌面端上：`markEffortCell()` 什么都没标 → 菜单里的推理等级照旧显示；
`driveApp()` 找不到触发器 → 变阻器照旧画着档位却什么也设不了。

**这正是项目自己在 `src/skin.css` 顶部写下的规矩**（「hash 会随 DSH 构建变化，本地名不会」），
只是 dialog.js 没有遵守。

修法是全部改成**只用本地名**，并且把找触发器的方式改成结构式而不是命名式：

```js
// 后缀就是触发器按钮的子节点，所以它的父级就是打开模型菜单的那个控件。
// 不能用 closest('[class*="_trigger"]') —— 后缀自己的类里就含 _triggerEffort，
// 它会匹配到自己，closest 返回的是那个 span。
const suffix = document.querySelector('[class*="_triggerEffort"]')
const trigger = suffix === null ? null : suffix.closest('button')
```

### 那条本该抓住它的检查，两次都没抓住

`test/selectors.test.mjs` 里就有「皮肤不得依赖 hash 类名」这一条。它漏掉是因为：

1. **只读了 `src/skin.css`**，而驱动逻辑全在 `src/dialog.js` 里；
2. **hash 提取是从头按 `_` 切的**，`_7KE1Ra_triggerEffort` 切出来第一段是空串，
   于是这个形状的类名**根本不在被检查的 hash 集合里**。

现在两条都修了：两个文件都扫，并且先去掉前导 `_` 再取 hash。反向验证过——
把旧的 `_7KE1Ra_triggerEffort` 塞回 skin.css，测试立刻失败（`fail 1`），改回来就过。

## 上游不提供思考强度时

`ModelSelect` 只在模型**确实有**推理等级时才渲染那个后缀：

```jsx
effortLabel !== void 0 && <span className={triggerEffort}>{effortLabel}</span>
```

所以「后缀不在」就是应用自己给出的答案。皮肤据此让变阻器**下岗**：

| | 可用 | 不可用 |
|---|---|---|
| 读数 | 空载 / 轻载 / 重载 / 满载 | **不适用** |
| 点亮格 | 按档位 | 0 |
| 手柄 | 显示 | 不显示 |
| `aria-disabled` | `false` | `true` |
| 拖动 / 方向键 | 生效 | 不生效 |

判断要连续 **8 个采样（约 2 秒）**都「触发器在、后缀不在」才成立，因为启动时输入卡片
先于模型触发器出现，一次落空就宣布「不适用」会在一个马上要出现的控件上闪一下。

实测（`tools/scenarios/effort-absent.js`，把后缀的类名临时改掉来复现条件）：

```
可用时        unavailable=false  aria-disabled=false  读数 轻载   22 格亮  手柄 block
后缀不可见时   unavailable=true   aria-disabled=true   读数 不适用  0 格亮   手柄 none
按方向键       读数仍是 不适用（控件确实不动）
后缀恢复后     unavailable=false  读数回到档位

checks: 8/8 PASS
```

## 仪表盘层：侧边栏与对话背景

侧边栏和对话区是屏幕上最大的两块表面，原来只是「DSH 换了个色」。现在它们有自己的处理：

| 位置 | 做法 | 节点 |
|---|---|---|
| 侧边栏列 | 四角括线 + 栅格纹理 + `550C // CONSOLE` 标签带 | 一个 `.c-panel-frame` |
| 每条会话行 | 状态刻度，悬停/聚焦时点亮 | 每行一个 `.c-panel-tick` |
| 对话背景 | 坐标网格（主 120px / 次 24px）、顶部洋光、一条缓慢下行的扫描头 | 一个 `.c-grid` |

**背景是画在应用下面的，不是盖在上面。** `.c-grid` 插在 `<body>` 最前面、`z-index:-1`：
外壳、侧边栏、中栏**各自都画自己的背景**，所以只有应用留空的地方才透出网格。画在上面就不是
「控制台的底板」，而是「糊在应用上的一层」。

装饰全部是 `position:absolute` + `pointer-events:none`，所以不参与布局、也吃不掉点击——
`npm run geometry` 实测：**框外 11 个地标逐字节一致**，对话框区域照旧按设计移动。

### 三个把这一层做出来时才暴露的问题

**① 装饰的包含块不是它挂上去的那个元素。** `.c-panel-frame` 挂在侧边栏列上，但那一列没有
`position`，于是 `inset: 6px` 解析到了视口——第一次实测框是 **1588px 宽**，几乎整个窗口。
修法是给列加一个 `data-550c-panel-anchor` 标记，由样式表给它 `position:relative`（唯一一个
允许设在 DSH 元素上的布局属性，且不带偏移，不动任何东西）。

**② 一次性的挂载赶不上 React 的渲染。** 皮肤 apply 时外壳还没渲染完，`findSidebar()` 返回 null，
括线框永远没被创建——而行刻度却出现了，因为刻度来自 MutationObserver 而框来自一次性分支。
现在两者走同一个可重入的 `decorate()`。

**③ 新增一个偏好字段，宿主会把它丢掉。** `panel` 加进了客户端和宿主两边的白名单，
**却漏了客户端 hydrate 里第三份字段清单**。Desktop 上宿主是唯一真相（端口每次启动都变，
浏览器存储是空的），于是它那份没有 `panel` 的记录胜出，样式表拿到的属性值是字符串 `"undefined"`。

三份清单现在合成一份 `PREFS_SCHEMA`，并且加了一条测试把**两半**钉在一起。这条测试立刻抓出了
一个**早就存在的**不一致：客户端叫 `mark`、宿主叫 `hud`——所以「550C 标志」这个开关在 Desktop 上
**从来就没有跨重启保存过**。宿主现在写 `mark`，同时仍接受 `hud` 作为旧文件的别名。

## 工具本身的坑：客户端 bundle 会被永久缓存

调这一层时被它耽误了好几次，值得写下来。

客户端 bundle 的 URL 是 `plugins/??dsh-550c-skin/client.js&rev=<进程 nonce>`，而响应是
`max-age=31536000, immutable`。**`rev` 是每个宿主进程一个 nonce，重建 `lib/client.js` 不会改变它**，
而 `tools/shoot.mjs` 复用 `.verify/browser-profile`（实测 656MB）。于是浏览器一直用它第一次抓到的
那一份，改动永远到不了页面上——表现得就像「我的 CSS 改了没生效」。

`Page.reload({ ignoreCache: true })` **救不了**：bundle 是客户端模块加载器在文档 load 之后才去取的，
reload 的那个标志早就消费掉了。重启宿主有效（nonce 变了）。

所以 `tools/shoot.mjs` 现在有 `--fresh`：先删掉整个浏览器 profile 再跑。

## 截图

`tools/shoot.mjs` 通过 DevTools 协议驱动真实浏览器，可以做到普通 `--screenshot` 做不到的事：
在精确时刻截图、先注入偏好再量、跑场景脚本、把页面状态读回来、**捕获未处理异常**。

捕获异常这一项不是可选的：插件在事件监听器里抛错时，没有控制台输出，只有一个静默失效的控件。
加上捕获之后，第一个被抓到的就是本插件自己的初始化顺序错误：

```
[exception] Error: failed to import loader entry (dsh-550c-skin):
            Cannot access 'DEBUG' before initialization
```

没有它，这个错误只会表现为「皮肤不生效」。
