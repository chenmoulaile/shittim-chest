# SHITTIM CHEST

**蔚蓝档案（Blue Archive）国际服剧情与活动复刻平台 V1** —— 清单驱动 · 完全离线

以「先将她们的小夜曲」（Serenade Promenade）活动为首个复刻目标，实现从引导加载 → 主菜单 → 活动中心 → 剧情播放 / MomoTalk / 记忆大厅 → 小游戏的完整闭环。

## 技术栈

- **Vue 3 + TypeScript + Pinia + Vite** —— 应用骨架与状态管理
- **PixiJS v8 + vue3-pixi** —— 剧情立绘渲染 / 记忆大厅 / 小游戏舞台
- **sql.js（SQLite WASM）** —— 进度存档持久化（localStorage 兜底）
- **清单驱动内容** —— 所有章节 / 桃信 / 小游戏关卡由 `public/content/manifest.json` 描述，运行期 0 远程请求

## 快速开始

```bash
npm install        # postinstall 会自动拷贝 sql.js 的 wasm 到 public/
npm run dev        # 开发模式
npm run build      # 类型检查 + 生产构建
npm run preview    # 预览生产构建（默认 http://localhost:4173）
```

## 内容脚本（可选）

```bash
npm run assets:generate   # 重新生成占位素材（SVG / WAV）
npm run content:validate  # 校验 manifest 清单完整性
```

## 架构

```
src/
├── core/
│   ├── manifest/    # ManifestResolver：清单解析与单元定位
│   ├── assets/      # AssetLoader：Pixi bundle 资产加载
│   ├── audio/       # AudioManager：BGM / SFX / 语音
│   ├── story/       # Controller（叙事内核）+ RenderManager（Pixi 渲染）
│   │                # + DataResolver + LobbyModelAdapter
│   ├── minigame/    # 统一小游戏生命周期接口 + 模块注册表
│   │                # └── modules/serenadeStage：节拍协奏战（回合制 + 节拍判定）
│   ├── db/          # Database：sql.js 存档（章节已读 / 羁绊 / 分数）
│   └── utils.ts     # tween / wait / ease 等通用补间
├── views/           # BootScreen / MainMenu / ActivityBrowser / StoryPlayerView
│                    # / MomotalkView / MemoryLobbyView / MinigameView
├── components/      # LobbyStage（vue3-pixi 记忆大厅舞台）
└── store/           # appStore / progressStore / settingsStore（Pinia）
```

## 小游戏：节拍协奏战（serenade-stage）

- 回合制指令（演唱·强音 / 和声·治愈 / 终乐章）+ 节拍判定条
- 判定 PERFECT（暴击 ×1.6）/ GOOD / MISS，连击加成、充能大招
- 支援被动：樱子·和声治愈（每回合回血）、美祢·应援护盾（每 3 回合）
- 波次推进 + BOSS 战 + 结算评级（S/A/B/C）与得分持久化

## 验收

`docs/screenshots/` 内含 18 张流程截图与 `acceptance-report.json`：
**19/19 检查项通过**（含离线可用性——拦截全部外部请求后完整启动浏览、运行期 0 远程请求、页面 0 JS 错误）。

复跑验收：

```bash
npm run build && npm run preview &
node scripts/visual-check.mjs   # 需本机安装 playwright
```

## 内容合规

- 所有素材为脚本生成的占位图 / 合成音，仅用于开发验证
- recap 类活动自动隐藏小游戏入口（状态合规）
- 羁绊后话需通关第 4 话解锁（解锁链校验）
