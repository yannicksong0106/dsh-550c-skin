# 验证

[← 回到 README](../README.md)

这套皮肤的核心承诺是「**只改外观，不改布局**」。这不是一句声明——下面每一条都是在这台机器上实测出来的，
而且失败的那两次迭代也被记录下来了，因为它们正是这条检查存在的理由。

## 一条命令

```sh
npm test          # 12 项，纯 node，不需要浏览器
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
