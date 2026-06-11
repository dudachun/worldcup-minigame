# 田总足球小游戏 Codex 接力文档

## 当前目标

把《2026世界杯AI模拟器小游戏设计方案（2D极简文字射门版）》细化并落地为一个 H5 2D 轻量足球 AI 模拟小游戏。第一阶段目标是做出可运行 MVP：选两队、选择单局时长、选择战术、自动模拟比赛、实时文字解说、2D 球场点位演出、赛后数据结算。

## 用户偏好与硬约束

- 沟通语言：中文。
- 游戏形态：H5 小游戏，轻量、快速、休闲、移动端优先。
- 球员姓名：使用真实球员姓名，但游戏内显示名必须加国家名前缀，例如 `韩国孙兴慜`、`巴西维尼修斯`。这是产品层面的虚拟化显示名策略，不等同于法律上必然规避姓名权/肖像权风险。
- 队徽：需要抽象队徽，不使用真实队徽、FIFA 标识、世界杯官方标识。
- 美术资产：全部使用 `imagegen` 生成。用户原先称为 ImageJinchu，已确认实际指 `imagegen`。
- 游戏时长：玩家可选择 `60 / 120 / 180 秒`。
- 战术选择：玩家赛前可选择战术，不是纯观看。
- 文字、比分、按钮、数据：必须代码原生渲染，不放进图片。
- 商业合规倾向：避免官方 Logo、真实队徽、FIFA/世界杯官方视觉标识、真实球员肖像。球员姓名当前按用户要求改为真实姓名加国家前缀显示。

## 已读取的原始资料

原始 Word 文档：

`C:/Users/GM/Desktop/临时文件夹/2026世界杯AI模拟器小游戏设计方案（2D极简文字射门版）.docx`

文档要点已经读取完毕：

- 轻量 2D 休闲模拟小游戏。
- 聚焦射门、扑救、进球/未进球，不模拟完整足球流程。
- 单局 60-180 秒，默认可用 120 秒。
- AI 自动推演，每 10-20 秒触发一次攻防射门回合。
- 实时文字解说。
- 赛后展示全场数据与球员个人数据。
- 2D 极简球场，顶部比分倒计时，中部球场，底部文字播报。

发现并修正的问题：

- 文档前文写 2026 世界杯 48 队，后文功能清单写 32 队。已决定统一按 2026 世界杯 48 队、12 组体系设计。

## 已使用的技能、插件和工具

- `matt-pocock`：确认这是软件工程/游戏开发任务，应按工程化方式推进。
- `game-studio`：浏览器游戏总体路线，默认 2D。
- `web-game-foundations`：确定模拟状态、渲染、UI、素材、调试边界分离。
- `game-ui-frontend`：确定赛中 HUD、文字播报、低遮挡游戏 UI 方向。
- `build-web-apps:frontend-testing-debugging`：用于本地渲染验证、Browser 插件优先级和 Playwright fallback 规则。
- `ui-ux-pro-max`：检索移动端游戏 HUD、数据展示、响应式和可访问性规则。
- `impeccable`：用于 UI 质量标准和避免 AI 味设计套路。
- `imagegen`：确认美术生成流程，并已生成一张主比赛界面视觉概念图。
- `Browser`：已通过 in-app browser 验证本地比赛页 DOM 状态和截图。
- `tool_search`：查过可用工具，确认后续可用本地浏览器/线程/自动化/多代理等能力。

## 已生成的视觉概念图

主比赛界面概念图：

`C:/Users/GM/.codex/generated_images/019eaf44-b72d-7741-b85c-f7cef2ae9057/ig_0e6e8e000cb250e4016a28c92030e8819787f000754bb56b4b.png`

这张图只用于锁定方向，不是最终生产资产。

视觉方向：

- 深色体育转播背景。
- 中央极简绿色 2D 球场。
- 顶部紧凑比分 HUD。
- 抽象国家队徽。
- 底部实时解说流。
- 金色用于进球高亮。
- 蓝色用于扑救/防守。
- 红橙用于危险进攻。
- 不做官方世界杯标识，不做真实队徽，不使用真实球员肖像；球员显示名按用户要求使用真实姓名加国家名前缀。

## 当前产品方案

### 产品定位

“2 分钟看完一场世界杯关键射门战”的 H5 AI 模拟小游戏。重点不是操作足球，而是选择球队、战术和比赛时长后，看 AI 根据球队、球员、门将、战术和随机波动生成一场可信、有戏剧性的比赛。

### MVP 模式

第一阶段只做 `快速模拟`：

- 玩家选择主队、客队。
- 玩家选择比赛时长：60 / 120 / 180 秒。
- 玩家给双方选择战术。
- 点击开始后自动模拟。
- 比赛结束展示数据结算。

后续可扩展：

- 官方赛程模拟。
- 爆冷挑战。
- 分享战报海报。
- 历史战绩。

### 推荐技术栈

- `Vite`
- `TypeScript`
- `React`
- DOM/CSS 球场动画：CSS transition 负责位移，CSS keyframes 负责瞬时特效，`setTimeout` 时间线负责编排。

架构原则：

- React 负责选队、设置、HUD、文字解说、赛后数据。
- 球场组件使用 DOM 元素渲染球员点、门将、足球、球门、轨迹和状态，不再依赖 Phaser/canvas。
- AI 模拟器写成纯 TypeScript 模块，独立于渲染层和 React，方便测试。

## 核心模拟逻辑

每局比赛生成多个关键事件，不做完整足球跑位。事件状态机：

`控球方决定 -> 进攻方式 -> 射门球员 -> 射门类型 -> 门将反应 -> 结果 -> 数据入账`

进攻方式：

- 中路渗透
- 边路传中
- 反击推进
- 禁区外远射
- 定点直塞
- 门前混战

射门类型：

- 推射
- 抽射
- 头球
- 低射
- 远角弧线
- 补射

结果类型：

- 进球
- 门将扑救
- 偏出
- 击中门框
- 被封堵
- 脱手后二次射门

概率核心：

`xG = 基础机会质量 + 球队进攻加成 + 球员射门加成 - 对手防守压制 - 门将压制 + 随机波动 + 战术/比分修正`

约束：

- 120 秒局常规比分应集中在 0-0 到 4-3。
- 进球后短时间内避免连续进球。
- 强队优势明显，但弱队保留 10%-20% 制造高质量机会的可能。

## 战术系统 V1

战术可先做成影响参数的轻系统：

- `均衡推进`：无明显偏置，稳定性高。
- `高压进攻`：提高射门频率和危险机会，降低防守稳定。
- `稳守反击`：降低控球和总射门，提升反击机会质量，提升防守。
- `边路冲击`：提升传中、头球、门前混战概率。
- `中路渗透`：提升直塞、推射、远角射门概率，略提高被封堵概率。

## 数据展示体系

赛后分三层展示：

1. 比赛结果卡
   - 最终比分
   - MVP
   - 胜率倾向
   - 本场关键词，例如门神之夜、火力压制、爆冷、反击制胜

2. 比赛数据
   - 控球率
   - 总射门
   - 射正
   - 进球
   - 扑救
   - 门框
   - 关键机会
   - 预期进球 xG

3. 球员数据
   - 进攻球员：射门、射正、进球、关键进攻、xG、效率评分。
   - 门将：面对射正、扑救、失球、扑救率、门将评分。

建议增加：

- 射门地图：用球场点位展示每次射门。进球金色，扑救蓝色，偏出灰色。

## 资产计划

所有资产用 `imagegen` 生成。文字全部代码渲染。

第一批核心可玩资产：

- 2D 横版球场背景。
- 2D 竖版/移动端球场背景。
- 抽象队徽模板。
- 足球小图标。
- 进球光效。
- 扑救冲击效果。
- 射门轨迹效果。

第二批 UI 与展示资产：

- 主菜单背景。
- 战术选择背景。
- 赛后结果海报背景。
- MVP 展示背景。

第三批运营与分享资产：

- 比赛战报海报。
- 爆冷挑战海报。
- 球队对阵封面图。

## 已遇到的问题与解决方式

1. Word 文档路径包含中文，Python 直接用硬编码路径时出现编码问题。
   - 解决：用 PowerShell 先定位 docx 文件，再把路径作为参数传给 Python 解包读取。

2. 原方案存在 48 队与 32 队冲突。
   - 解决：统一为 2026 世界杯 48 队体系。

3. 用户提到 ImageJinchu，实际意思是 imagegen。
   - 解决：后续所有美术生成统一按 `imagegen` 技能和工具处理。

4. 商业授权风险。
   - 当前策略：按用户要求使用真实球员姓名并添加国家名前缀作为游戏内显示名；不使用真实队徽、FIFA/世界杯官方视觉标识、真实球员肖像。
   - 风险说明：国家名前缀是产品显示策略，不等同于法律层面的完整授权规避。

## 当前实现进度

已完成 MVP 第一轮骨架：

1. 已创建 `Vite + React + TypeScript` 项目。
2. 曾安装并接入 `phaser`，当前已替换为 DOM/CSS 球场动画并移除依赖。
3. 已建立主要目录：
   - `src/data`
   - `src/simulator`
   - `src/game`
   - `src/assets`
4. 已写入 49 支球队。官方 2026 分组数据仍是 48 队，中国队额外加入全部球队列表。每队包含 5 名核心进攻球员 + 1 名门将，球员名已改为真实姓名加国家前缀显示；每队已配置默认阵型和默认战术。
5. 已实现 5 种赛前战术：
   - 均衡推进
   - 高压进攻
   - 稳守反击
   - 边路冲击
   - 中路渗透
6. 已实现比赛模拟器：
   - 三档时长：60 / 120 / 180 秒
   - 双方战术参数
   - 攻防事件生成
   - xG 计算
   - 进球/扑救/偏出/封堵/中框结果
   - 实时比分
   - 球队统计
   - 球员统计
   - MVP 评选
7. 已实现 React 主流程：
   - 选主队/客队
   - 选比赛时长
   - 选双方战术
   - 点击首页开始游戏后播放足球飞入过场
   - 开始模拟
   - 赛中实时解说
   - 立即结算
   - 赛后数据面板
8. 已实现 DOM/CSS 球场可视化：
   - 使用 `imagegen` 生成的球场背景
   - 显示双方 22 人点位：每队 10 名非门将 + 1 名门将
   - 根据球队默认阵型渲染站位，例如 `4-3-3`、`4-2-3-1`、`5-3-2`
   - 进球金色高亮，扑救蓝色反馈，射失/中框/封堵触发震动或轨迹反馈
   - CSS transition 负责位移，CSS keyframes 负责特效，`setTimeout` 负责编排时间线
9. 已启动本地开发服务器：
   - `http://127.0.0.1:5175`
   - HTTP 请求验证返回 `200`

## 当前项目文件

- `package.json`：脚本和依赖。
- `index.html`：Vite 入口。
- `vite.config.ts`：Vite React 配置。
- `tsconfig.json`：TypeScript 配置。
- `src/main.tsx`：React 入口。
- `src/App.tsx`：主界面、流程状态、赛后数据。
- `src/styles.css`：整体视觉和响应式样式。
- `src/data/teams.ts`：49 支球队、真实球员显示名、分组模式、默认阵型和默认战术。
- `src/data/tactics.ts`：战术系统。
- `src/data/formations.ts`：7 种 11 人制阵型坐标模板。
- `src/simulator/types.ts`：核心类型。
- `src/simulator/fieldGeometry.ts`：射门结果落点计算，比赛动画和射门地图共用。
- `src/simulator/scoreboard.ts`：可见比分计算，保证未播放事件不会提前暴露最终比分。
- `src/simulator/random.ts`：可复现随机工具。
- `src/simulator/matchSimulator.ts`：比赛模拟器。
- `src/game/MatchField.tsx`：DOM/CSS 球场动画渲染，使用 transition、keyframes 和 setTimeout 时间线。
- `src/assets/home/football-hero.webp`：`imagegen` 生成并压缩后的首页夜间足球场背景。
- `src/assets/home/source/football-hero-source.png`：首页足球场背景源图。
- `src/assets/ball/kickoff-football-realistic.webp`：`imagegen` 生成、抠图并压缩后的写实过场足球素材，当前 CSS 实际引用。
- `src/assets/ball/kickoff-football-realistic.png`：写实足球透明 PNG 源资产，用于后续重新压缩或编辑。
- `src/assets/ball/source/kickoff-football-realistic-source.png`：写实足球生成源图，保留原始绿幕版本。
- `src/assets/pitch-bg.png`：`imagegen` 球场背景源文件，当前不直接打包。
- `src/assets/pitch-bg.webp`：当前 DOM 球场使用的压缩球场背景。
- `src/assets/emblems/teams/`：49 个 `imagegen` 抽象队徽。
- `src/assets/vfx/`：进球、扑救、射门轨迹、战报背景特效资产。
- `tests/matchSimulator.test.ts`：比赛模拟器单元测试。
- `scripts/qa-ui.mjs`：本地 UI 冒烟验收脚本。
- `PRODUCT.md`：产品型游戏界面的设计上下文，供后续 UI 迭代使用。

## 本轮新增问题与解决方式

0. 用户要求从虚构球员名改为真实球员名，并在每个球员名前加国家名前缀。
   - 解决：已更新 `src/data/teams.ts`。当前已覆盖 49 支球队，每队 5 名核心进攻球员和 1 名门将。
   - 风险说明：国家前缀可以形成游戏内显示名，但不应被当成可靠法律规避方案。仍应避免真实肖像、官方队徽、官方赛事 Logo。

7. 用户要求国家和球员名单一次性全部补齐。
   - 解决：已重写 `src/data/teams.ts` 为 `teamSeeds + 自动国家名前缀` 的结构。
   - 新增 `worldCupGroups`，记录 A-L 共 12 个小组，每组 4 队。
   - 已验证：49 个唯一队伍；官方小组引用仍为 48 队；每队 5 名进攻球员 + 1 名门将。

8. 用户反馈队伍选择下拉列表白字白底，看不清。
   - 解决：已更新 `src/styles.css`，把 `select` 和 `option` 改为浅底深字，并增加 focus 状态。

9. 用户要求所有球队里增加中国队，测试阶段为 49 队；后续世界杯模式用中国替换伊拉克。
   - 解决：已在 `src/data/teams.ts` 增加中国队，含 `中国武磊`、`中国张玉宁`、`中国韦世豪`、`中国谢文能`、`中国王上源`、`中国王大雷`。
   - 保留 `worldCupGroups` 为官方 48 队分组，新增 `worldCupGroupsWithChina`，其中 I 组用 `china` 替换 `iraq`。
   - 用户口头提到“2016世界杯”，当前按项目上下文理解为“2026世界杯”。

10. 用户要求实时解说不要显示模拟秒数，而是等比换算成 90 分钟比赛时间。
   - 解决：`MatchEvent` 新增 `displayMinute`，内部 `second` 继续用于播放进度。
   - 换算公式：`round(second / duration * 90)`，并限制在 1-90 分钟。
   - 例如 60 秒模式下第 30 秒会显示为第 45 分钟；120 秒模式下第 60 秒也显示为第 45 分钟。
   - 实时解说列表和解说正文已改为分钟制，顶部倒计时仍显示真实模拟剩余秒数。

11. 用户要求按顺序完成六项后续开发。
   - 1）队伍选择器：已把原生下拉升级为搜索式队伍面板，支持关键词搜索、洲筛选、小组筛选、主客队互斥。
   - 2）中国队模式：已增加 `自由49队`、`官方48队`、`中国替换` 三种模式。
   - 3）赛后射门地图：已在结果页新增射门地图，按每次事件坐标显示进球、扑救、未进点位。
   - 4）解说文案库：已改为组合式解说模板，覆盖进攻铺垫、射门动作、进球、扑救、封堵、偏出、中框等结果。
   - 5）AI 平衡：已降低基础射门事件数和进球概率上限，调整 xG 范围，降低离谱比分概率。
   - 6）抽象队徽：已用 `imagegen` 生成 7x7 抽象队徽图集并裁切为 49 个队徽 PNG，接入队伍数据。图集原文件保存在 `src/assets/emblems/source/emblem-atlas.png`，实际使用文件在 `src/assets/emblems/teams/`。

12. 用户反馈球队筛选器难用、球队图标过大、卡片因队名长度不对齐。
   - 解决：`src/App.tsx` 中 `TeamPicker` 已改为球队卡片结构，每张卡展示小 logo、球队名、组别、地区、英文缩写。
   - 解决：`src/styles.css` 中球队列表已从纵向列表改为固定高度卡片网格；主客队选择器改为上下排列，给筛选控件和卡片留出足够宽度。
   - logo 视觉尺寸已从原先 38px 缩到 14px 图像、18px 外框，避免队徽压过球队信息。
   - 同步新增 `PRODUCT.md`，记录产品型游戏 UI 的设计原则和可访问性要求。

13. 用户要求尝试使用 Computer Use/“Computilus” 插件查看当前界面。
   - 已读取 Computer Use 技能说明并尝试连接 Windows 应用。
   - 当前失败原因：插件初始化时报错 `Package subpath './dist/project/cua/sky_js/src/targets/windows/internal/computer_use_client_base.js' is not defined by "exports"`。
   - 按插件安全规则，未使用 PowerShell 或其他前台 UI 自动化绕过。当前验证方式为 `npm run build` 和 `http://127.0.0.1:5175/` HTTP 200，视觉验收需用户在当前浏览器刷新确认。

14. 用户要求把后续 1-6 项全部完成。
   - UI 验收：新增 `scripts/qa-ui.mjs` 和 `npm run qa:ui`，检查桌面设置页、桌面结果页、移动端设置页、球队卡数量、赛后射门点和控制台/网络错误。
   - 移动端体验：压缩移动端比分栏，设置区优先展示，按钮全宽，球队卡缩写不再被截断。
   - 模拟测试：新增 `tests/matchSimulator.test.ts`，覆盖统计闭环、90 分钟换算、事件数量、射门坐标、MVP 有效性和多 seed 稳定性。
   - 赛后信息：射门地图升级为可点击点位，新增事件回放详情和射门事件列表，可查看球员、路线、射门类型、xG、结果、解说。
   - 性能优化：`src/assets/pitch-bg.png` 约 2.1MB，已转为 `src/assets/pitch-bg.webp` 约 28KB，`MatchField` 已改用 WebP。PNG 源文件保留作回退。
   - 美术资产：使用 `imagegen` 生成 `src/assets/vfx/source/match-vfx-atlas.png`，裁切出 `goal-burst.webp`、`save-ripple.webp`、`shot-trail.webp`、`report-bg.webp`，并接入实时进球播报、射门地图、事件详情和结果面板。

15. 本轮工具/环境问题。
   - `npm install -D vitest @playwright/test` 后暴露 Vite/React 类型依赖之前不完整。
   - 已显式补齐 `vite`、`typescript`、`@vitejs/plugin-react`、`@types/react`、`@types/react-dom`。
   - `npx playwright install chromium` 两次下载超时；`scripts/qa-ui.mjs` 已改为优先使用 Playwright 自带 Chromium，缺失时回退到系统 Edge/Chrome。

16. 用户要求把原单页流程拆成三个界面，并确认首页暂时只保留一个 `开始游戏`。
   - 解决：`src/App.tsx` 新增 `screen: 'home' | 'transition' | 'setup' | 'match'`，其中 `transition` 是首页到赛前设置的短过场；比赛内部状态改为 `matchPhase: 'running' | 'results'`。
   - 第一界面：首页，只显示游戏标题、简短说明和一个 `开始游戏` 按钮。
   - 第二界面：赛前设置，只显示队伍模式、主队/客队、比赛时长、双方战术和 `开始模拟比赛`。
   - 第三界面：比赛与结果，只显示顶部比分、球场、实时解说、立即结算/再来一场/重新选队、完赛结果和数据。
   - 已在 `PRODUCT.md` 记录后续赛季模式预留：未来用户可选择一个球队进行连续赛季模拟，当前阶段先完成单场快速模拟。
   - `scripts/qa-ui.mjs` 已更新为覆盖：首页 -> 开始游戏 -> 设置页 -> 开始模拟比赛 -> 比赛页 -> 立即结算 -> 结果页。

17. 用户提供 CloudCode 球场动画报告，要求吸收 CSS transition、CSS keyframes、setTimeout 时间线方案，并同步修改实时解说。
   - 解决：`src/game/MatchField.tsx` 已从 Phaser/canvas 改为 React DOM 球场。动态元素包括双方 22 个场上点位、足球、射门轨迹、球门闪光和场地状态标签。
   - 动画架构：CSS transition 控制球员/足球 left/top 位移；CSS keyframes 控制进球闪光、比分跳动、射失震动、扑救光晕、轨迹脉冲；`setTimeout` 编排推进、射门、结果、复位。
   - 已移除 `phaser` 依赖，生产 JS 从约 500KB+ 降到约 254KB，Vite chunk 大小提醒消失。
   - 实时解说规则已改为每场 10-15 条随机事件，比赛时长只影响事件在 60/120/180 秒中的分布。
   - 前端实时解说不再显示 `已播/总数` 或任何第几条/共几条信息，只显示比赛分钟和播报内容。
   - `scripts/qa-ui.mjs` 已增加检查：DOM 球场有 22 个球员/门将点、无 canvas、解说头部不含 `/`、完场后播报条数为 10-15。

18. 用户确认场上人数规则为每队 11 人，含守门员，并要求射门地图点位靠近球门、球队有默认战术。
   - 解决：新增 `src/data/formations.ts`，当前支持 `4-3-3`、`4-4-2`、`4-2-3-1`、`3-5-2`、`5-3-2`、`4-5-1`、`3-4-3` 七种阵型模板；每个模板提供 10 个非门将站位，门将由球场组件单独渲染。
   - 解决：`src/data/teams.ts` 为 49 支球队全部配置 `defaultFormationId` 和 `defaultTacticId`；用户选中球队时会自动采用该队默认战术，但仍可手动改战术。
   - 解决：`src/game/MatchField.tsx` 根据双方默认阵型渲染场上 22 个点位，半场镜像时同步镜像阵型和门将位置。
   - 解决：新增 `src/simulator/fieldGeometry.ts`，比赛动画和赛后射门地图共用射门结果落点；进球、扑救、门框、偏出靠近球门，封堵保留在封堵点。
   - 说明：当前球队数据仍保留 5 名核心进攻球员 + 1 名门将用于事件生成、解说和个人统计；场上 11 人是比赛画面阵型表达，不等同于完整 23 人大名单系统。

19. 用户要求首页加入足球场美术、点击开始游戏播放非线性足球过场、选队页更像游戏，并修复比分提前显示最终结果。
   - 首页美术：使用 `imagegen` 生成夜间足球场背景，前端使用 `src/assets/home/football-hero.webp`，源图保存在 `src/assets/home/source/football-hero-source.png`。
   - 过场动画：`src/App.tsx` 新增 `KickoffTransition`；点击开始游戏后进入 `transition` 状态，CSS 用 `kickoff-ball-flight` 让足球从左上飞入、放大遮挡镜头、再飞出，随后进入赛前设置。`prefers-reduced-motion` 下缩短为快速切换。
   - 赛前界面：新增 `TeamSlot` 和 `versus-board`，先显示主客队槽位、VS、比赛时长、默认阵型和当前战术，再显示球队筛选卡片、时长和战术。
   - 视觉统一：`src/styles.css` 已把首页、赛前设置、球队卡、战术按钮、比赛按钮和比分牌统一成深绿球场底、金色主按钮、固定 8px 圆角和游戏化下压反馈。
   - 比分修复：新增 `src/simulator/scoreboard.ts`，`liveScore` 只从已播放事件计算；比赛刚开始固定 0-0，只有进球事件被揭示后才更新比分，立即结算或完场后才展示最终比分。
   - QA：`scripts/qa-ui.mjs` 新增检查比赛刚开始比分必须为 `0-0`，并等待真实选队页标题，避免过场文案干扰定位。

20. 用户反馈过场足球不像足球，并要求游戏界面播报文字加黑色阴影；随后进一步要求足球必须是写实风格，不要动画或卡通风格。
   - 解决：使用内置 `imagegen`/GPT-IMAGE2 路径生成写实黑白皮革足球素材，先生成绿幕源图，再用 `remove_chroma_key.py` 抠成透明 PNG，最终压缩为 `src/assets/ball/kickoff-football-realistic.webp` 供过场动画使用。
   - 解决：`src/styles.css` 中 `.kickoff-ball` 已从 CSS conic-gradient 假球改为写实透明 WebP 足球图，并保留 drop-shadow 以维持镜头冲击感。
   - 解决：`src/styles.css` 中 `.live-feed, .live-feed *` 已加入 `rgba(0,0,0,0.95)` 的双层 `text-shadow`，覆盖实时解说标题、时间和播报正文。
   - 验证：浏览器中读取 `.kickoff-ball` 的 `backgroundImage` 为 `src/assets/ball/kickoff-football-realistic.webp`；读取 `.feed-list p` 的 `text-shadow` 为 `rgba(0, 0, 0, 0.95) 0px 1px 2px, rgba(0, 0, 0, 0.95) 0px 2px 8px`。

21. 用户要求把项目部署到 GitHub，并通过 GitHub Pages 二级站点直接访问。
   - 目标仓库：`dudachun/worldcup-minigame`。
   - 目标访问地址：`https://dudachun.github.io/worldcup-minigame/`。
   - 已新增 `.github/workflows/deploy.yml`，push 到 `main` 后会自动执行 `npm ci`、`npm test`、`npm run build` 并部署 `dist` 到 GitHub Pages。
   - 已新增 `.gitignore`，排除 `node_modules`、`dist`、`dev-server.log`、`*.tsbuildinfo`、`*.log`。
   - 已新增 `README.md`，记录本地运行、验证和 GitHub Pages 地址。
   - 已更新 `vite.config.ts`，生产模式 `base` 为 `/worldcup-minigame/`，本地开发仍为 `/`。
   - 本地 Git 仓库已初始化，分支为 `main`；已创建提交 `4f1afed`，提交信息为 `Deploy worldcup minigame to GitHub Pages`。
   - 当前阻塞：本机没有 `gh` CLI，也没有 `GITHUB_TOKEN`/`GH_TOKEN`；GitHub App 当前只安装在账号 `dachun12345`，不是用户指定的 `dudachun`；`dudachun/worldcup-minigame` 查询为 404；普通 `git push` 到 GitHub 时网络连接 `github.com:443` 超时。
   - 继续方式：用户需要先在 GitHub 上创建空仓库 `dudachun/worldcup-minigame` 并确保本机 Git 可以认证推送，或把 Codex/GitHub App 连接到 `dudachun` 账号后继续。

1. `npm init -y` 失败。
   - 原因：npm 默认使用中文目录名 `田总足球小游戏` 作为 package name，不符合 npm 包名规则。
   - 解决：手动创建合法英文包名 `world-cup-ai-shootout` 的 `package.json`。

2. PowerShell 不支持当前写法中的 `&&`。
   - 原因：直接在 PowerShell 中执行多段 npm 命令时解析失败。
   - 解决：拆成两条安装命令执行。

3. 第一次 npm 安装超时且未落盘。
   - 解决：改用 `--registry=https://registry.npmjs.org/` 并延长超时时间，安装成功。

4. TypeScript 6 阻断旧的 `moduleResolution: Node`。
   - 解决：改为 Vite 更适合的 `moduleResolution: Bundler`。

5. Phaser ESM 没有默认导出。
   - 历史解决：曾把 `import Phaser from 'phaser'` 改为 `import * as Phaser from 'phaser'`。
   - 当前状态：Phaser 已被 DOM/CSS 球场动画替换，`phaser` 依赖已移除。

6. 生产构建出现 chunk 体积提醒。
   - 历史状态：Phaser 进入主包时曾出现 Vite chunk 体积提醒。
   - 当前状态：移除 Phaser 后构建不再出现该提醒。

## 已验证

- `npm run build`：通过。
- `npm install`：依赖安装完成，无漏洞报告。
- 本地开发服务器：已启动，最近一次重启 PID 为 `11252`。
- 本地访问：`http://127.0.0.1:5175` 返回 HTTP `200`。
- 49 队数据完整性检查：通过。
- 官方分组仍为 48 队，`worldCupGroupsWithChina` 可用于中国替换伊拉克模式。
- 49 个抽象队徽文件检查：通过，打包时只包含实际队徽，不包含源图集。
- 球队卡片选择器修改后 `npm run build`：通过。
- `npm test`：通过，1 个测试文件、10 个测试。
- `npm run qa:ui`：通过，目标 URL `http://127.0.0.1:5175/`，检测到 98 个球队卡按钮、22 个 DOM 球员/门将点、0 个 canvas、12 条完场播报、12 个赛后射门点；同时验证比赛刚开始比分为 0-0。
- Browser in-app 验证：通过，当前页 title 为 `2026 世界杯 AI 模拟器`；比赛页检测到 22 个 DOM 球员/门将点、0 个 canvas、实时解说头部为 `实时解说完场`，无 `/` 计数暴露，控制台无错误/警告；设置页默认战术和球队阵型标签正常显示。
- UI 验收截图输出到系统临时目录：
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\desktop-home.png`
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\desktop-transition.png`
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\desktop-transition-cover.png`
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\desktop-transition-football-realistic.png`
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\desktop-setup.png`
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\desktop-match-animation.png`
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\desktop-results.png`
  - `C:\Users\GM\AppData\Local\Temp\world-cup-ai-shootout-qa\mobile-setup.png`
- 最新 `npm run build`：通过。主要球场背景构建产物为 `pitch-bg-*.webp` 约 28KB，首页背景 `football-hero-*.webp` 约 167KB，写实过场足球 `kickoff-football-realistic-*.webp` 约 93KB；主 JS 约 260KB gzip 前、约 83KB gzip 后。

## 下一步开发计划

优先级从高到低：

1. 给球队队徽做第二轮压缩或 WebP 化，当前 49 个 PNG 每个约 52-73KB。
2. 规划赛季模式入口：后续首页可增加模式选择，但当前首页只保留 `开始游戏`。
3. 增加赛中事件回放控制，例如暂停、上一球、下一球、倍速播放。
4. 把本轮 DOM/CSS 球场动画沉淀为可复用项目模板或 skill：输入事件时间线，输出球场点位演出。
5. 若后续要做更深阵容系统，再把每队从当前“5 名核心进攻球员 + 1 名门将”扩展到完整大名单，并让阵型位置绑定真实球员。
6. 增加更多赛后标签和爆冷/门神/效率等解释性文案。
7. 做一轮人工玩法验收，重点看 60/120/180 秒三种模式下 10-15 条播报的体感节奏是否合适。

## 新会话接力说明

如果另一个 Codex 会话继续本项目，请先读这个文件：

`D:/开发项目/田总足球小游戏/codex-handoff.md`

然后优先使用这些技能/插件：

- `matt-pocock`
- `game-studio`
- `web-game-foundations`
- `game-ui-frontend`
- `build-web-apps:frontend-app-builder`
- `imagegen`
- 必要时使用 Browser 插件做本地预览和截图验收。
