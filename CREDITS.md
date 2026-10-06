# 致谢与出处

## 550C 片头动画与配色原稿 —— Voidpocket

这个插件的视觉不是凭空设计的，和 [`dsh-550c-boot`](https://github.com/yannicksong0106/dsh-550c-boot) 一样，
**移植自同一份原稿**：片头页面与 550C 的配色由 **Voidpocket**
（GitHub: [@Voidpocket](https://github.com/Voidpocket)）提供，存放在片头仓库的
`assets/550C-source.html`，由那边的 `scripts/extract.mjs` 抽取。

本仓库的 `src/palettes.js` 里四套磷光配色（琥珀 P3 / 白 P4 / 绿 P1 / 青）取自那份原稿的
`data-scheme` 分块，**数值没有改**——所以皮肤和片头是同一台机器，而不是两台长得像的机器。
皮肤的 `docs/DESIGN.md` 记录了从原稿到 DSH 令牌阶梯的映射。

如果皮肤和片头的某处颜色对不上，那是本仓库的映射写错了，不是原稿的问题；请对照
`dsh-550c-boot` 的 `assets/550C-source.html`。

## 皮肤工程与移植 —— Ziyang Song

令牌阶梯（把原稿的颜色投到 DSH 的 `--dsw-*` 上）、对话框读数台、仪表盘层、
设置页与持久化，以及全部验证工具都在本仓库完成。
GitHub: [@yannicksong0106](https://github.com/yannicksong0106)

## 视觉参照

- [eDEX-UI](https://github.com/GitSquared/edex-ui)（GitSquared）——仪器面板的调性：
  四角括线、栅格底板、等宽读数。**只借调性，没有使用它的代码或素材。**
- DSH 自身的设置外壳与插槽账本——本插件的设置页是它的公开扩展点，不是绕过它做的。

## 许可

本仓库以 [MIT](LICENSE) 发布。原稿的授权状态见 `dsh-550c-boot` 的 `CREDITS.md`；
如果那里对再分发有额外要求，以那边为准。
