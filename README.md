# dsh-550c-skin

[中文](README.md) | [English](README.en.md)

[![npm](https://img.shields.io/npm/v/dsh-550c-skin?style=flat-square&logo=npm&label=npm)](https://www.npmjs.com/package/dsh-550c-skin)
[![License](https://img.shields.io/github/license/yannicksong0106/dsh-550c-skin?style=flat-square)](LICENSE)

**把 DeepSeek Harness 的整个界面换成 550C 控制台。**

四套磷光配色、一层扫描线、一圈暗角、等宽字体、机器读数栏 —— 和 `dsh-550c-boot` 的开机片头是同一套视觉。

![琥珀配色下的主界面](docs/preview-amber.png)

![青色配色下的主界面](docs/preview-cyan.png)

---

## 功能

### 🎨 四套磷光配色

| 配色 | 感觉 |
| --- | --- |
| **琥珀** | 默认。老式 CRT 终端，暖色磷光 |
| **绿** | 经典单色显示器 |
| **青** | 冷色调，偏现代控制台 |
| **白** | 干净、克制，适合白天用 |

也可以选 **关闭**，回到 DSH 原本的外观。

### 📺 屏幕质感

- **扫描线**：一层极淡的横向条纹，可以关掉
- **暗角**：四角压暗，注意力集中到中间
- **等宽字体**：读数、编号、代码全都对齐
- **机器读数栏**：把界面上的数值换成控制台的写法

### ⚙️ 设置

设置里的 **550C → 外观** 页：

- 换配色、调扫描线与暗角、开关等宽字体和面板风格
- **实时生效**，不用重启
- **记住你的选择**：存在本机（宿主半边写状态文件，客户端再拿 localStorage 兜一层）

### 🔄 检查更新

设置页里有**版本**一行：显示当前装的版本、去 npm 上查有没有新版，有的话可以一键更新（桌面端会让你去「设置 → 插件」里装）。

### 🎬 配套片头

同一个套件里还有一个开机片头插件：

> **[dsh-550c-boot](https://www.npmjs.com/package/dsh-550c-boot)** —— 550C 开机动画，接一段可交互的 UEG 访问授权。

两个插件**各自独立安装、互不依赖**；同时装上时，550C 设置页由 boot 提供，皮肤只往里加自己的行。

---

## 安装

```bash
npm i dsh-550c-skin
```

或者直接在 DSH 里：**设置 → 插件 → 安装** `dsh-550c-skin@latest`。装完重启一次客户端。

---

## 怎么用

```
设置 → 550C → 外观
  配色    琥珀 / 绿 / 青 / 白 / 关闭
  扫描线  开 / 关
  暗角    开 / 关
  等宽    开 / 关
  面板    完整 / 侧栏 / 网格 / 关闭
  版本    当前版本 · 检查更新
```

---

## 已知限制

- **桌面端不能自动更新**（desktop profile 由客户端独占管理）—— 检查更新会告诉你去「设置 → 插件」里装
- 现在是 **beta**（`0.1.0-beta.1`），配色的细节还会调整

---

## 授权与致谢

MIT © [Ziyang Song](https://github.com/yannicksong0106)

配色原稿来自 **[Voidpocket](https://github.com/Voidpocket)** 的 550C 片头动画；皮肤工程由 **Ziyang Song** 完成。详见 [CREDITS.md](CREDITS.md)。
