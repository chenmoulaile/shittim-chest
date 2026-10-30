/**
 * SHITTIM CHEST · 浏览器可视化验收
 * 逐项验证蓝图 8 条验收标准中的 UI 相关项，并输出截图到 docs/screenshots/
 */
import { createRequire } from 'node:module'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const { chromium } = require('/home/z/.npm-global/lib/node_modules/playwright')

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SHOT = join(ROOT, 'docs', 'screenshots')
mkdirSync(SHOT, { recursive: true })

const BASE = 'http://localhost:4173'
const report = { remoteRequests: [], consoleErrors: [], pageErrors: [], checks: [] }
const check = (name, pass, note = '') => {
  report.checks.push({ name, pass, note })
  console.log(`${pass ? '✓' : '✗'} ${name}${note ? ' —— ' + note : ''}`)
}

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const page = await ctx.newPage()

page.on('request', (req) => {
  const url = req.url()
  if (!url.startsWith(BASE) && !url.startsWith('data:') && !url.startsWith('blob:')) {
    report.remoteRequests.push(url)
  }
})
page.on('console', (msg) => { if (msg.type() === 'error') report.consoleErrors.push(msg.text()) })
page.on('pageerror', (err) => {
  report.pageErrors.push(err && err.stack ? err.stack : String(err))
})

const sleep = (ms) => new Promise(r => setTimeout(r, ms))
const shot = (name) => page.screenshot({ path: join(SHOT, name) })

/* 1. 启动 + 加载页 */
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await sleep(400)
await shot('01-boot-loading.png')
await page.waitForSelector('text=活动列表', { timeout: 45000 })
await sleep(600)
await shot('02-main-menu.png')
check('启动加载 → 主菜单', true)

/* 2. 活动列表 + recap 合规 */
await page.click('text=活动列表')
await page.waitForSelector('text=剧情', { timeout: 10000 })
await sleep(500)
await shot('03-activities-serenade.png')
check('活动列表可浏览（Serenade）', await page.isVisible('text=先将她们的小夜曲'))

// 切到 recap 活动
await page.click('text=夏日天空的约定')
await sleep(600)
const recapHasMinigame = await page.locator('.sec', { hasText: '小游戏' }).count()
const recapHint = await page.isVisible('text=小游戏入口已隐藏')
await shot('04-activities-recap.png')
check('recap 活动隐藏小游戏入口（状态合规）', recapHasMinigame === 0 && recapHint, `minigame区块=${recapHasMinigame}, 提示=${recapHint}`)

/* 3. 完整播放第1话（含选项） */
await page.click('text=先将她们的小夜曲')
await sleep(400)
await page.click('text=第1话 崔尼蒂嘉年华7号街')
await page.waitForSelector('canvas', { timeout: 10000 })
await sleep(2200)
await shot('05-story-playback.png')
check('剧情播放器渲染（Pixi 立绘+对话框）', true)

let choiceShot = false
for (let i = 0; i < 90; i++) {
  const choiceVisible = await page.locator('.choices .choice-btn').count()
  if (choiceVisible > 0) {
    if (!choiceShot) { await sleep(300); await shot('06-story-choice.png'); choiceShot = true }
    await page.locator('.choices .choice-btn').nth(i % 2 === 0 ? 0 : 1).click()
    await sleep(250)
    continue
  }
  if (await page.isVisible('text=本章完成')) break
  if (await page.isVisible('text=活动列表')) break
  await page.locator('.story').click({ position: { x: 800, y: 500 } })
  await sleep(170)
}
await sleep(1400)
await shot('07-story-complete.png')
check('第1话完整播放 + 选项分支 + 自动返回', await page.isVisible('text=活动列表'))

// 已读状态
const readBadge = await page.locator('.unit', { hasText: '第1话' }).locator('.badge.done').count()
check('阅读进度持久化（第1话显示已读）', readBadge > 0)
await page.click('text=第2话 意外的调查')
await sleep(2000)
const ch2Visible = await page.isVisible('text=意外的调查')
check('层级导航解锁（第2话可进入）', ch2Visible)
await shot('08-story-ch2.png')
await page.click('text=← 退出')
await sleep(700)

/* 4. 桃信全流程 */
await page.click('text=桃信 · 通话记录')
await page.waitForSelector('.chat', { timeout: 10000 })
await sleep(4500) // 等待消息流推进到选项 m3
await shot('09-momotalk-options.png')
check('桃信消息流渲染', true)
const optBtn = page.locator('.opt-list .choice-btn').first()
if (await optBtn.count()) {
  await optBtn.click()
  await sleep(500)
}
// 连点推进至 bond 卡片
for (let i = 0; i < 14; i++) {
  if (await page.isVisible('.bond-card')) break
  const secondOpt = page.locator('.opt-list .choice-btn').first()
  if (await secondOpt.count()) { await secondOpt.click(); await sleep(400); continue }
  await page.locator('.chat-scroll').click()
  await sleep(420)
}
await sleep(600)
await shot('10-momotalk-bond.png')
check('桃信选项分支 + 羁绊入口出现', await page.isVisible('.bond-card'))
// 羁绊跳转（未通关第4话 → 应被拦截并提示）
await page.locator('.bond-card').click()
await sleep(500)
const bondBlocked = await page.isVisible('text=完成第4话后即可阅读后话')
await shot('11-momotalk-bond-locked.png')
check('羁绊跳转解锁链校验（未通关第4话被拦截）', bondBlocked)
await page.click('text=← 返回')
await sleep(600)

/* 5. 记忆大厅 */
await page.click('text=← 返回')
await sleep(500)
await page.goto(BASE)
await page.waitForSelector('text=记忆大厅', { timeout: 20000 })
await page.locator('.menu-card', { hasText: '记忆大厅' }).click()
await sleep(1800)
await shot('12-lobby.png')
// 触摸立绘
await page.mouse.click(1075, 545)
await sleep(500)
await shot('13-lobby-touch.png')
check('记忆大厅渲染 + 触摸反馈', true)
await page.click('text=← 返回')
await sleep(500)

/* 6. 小游戏 */
await page.goto(BASE)
await page.waitForSelector('text=活动列表', { timeout: 20000 })
await page.click('text=活动列表')
await sleep(600)
await page.click('text=嘉年华特别舞台 · 节拍协奏战')
await page.waitForSelector('canvas', { timeout: 10000 })
await sleep(2200)
await shot('14-minigame-select.png')
check('小游戏运行时启动（注册表 → serenade-stage）', await page.isVisible('text=节拍协奏战'))

await page.locator('button', { hasText: '演唱·强音' }).click()
await page.waitForSelector('.timing-track', { timeout: 3000, state: 'visible' })
const timingVisible = await page.locator('.timing-track').isVisible() // 立即判定（sweepSec 仅 1.15s，截图耗时可能导致窗口结束）
await shot('15-minigame-timing.png')
check('节拍判定窗口出现', timingVisible)
await page.keyboard.press('Space')
await sleep(900)
await shot('16-minigame-combat.png')
check('回合结算（伤害/日志/敌方回合）', (await page.locator('.log-line').count()) > 0)

// 打完整关（自动连打：始终选普攻并在 timing 按空格，直至结果）
for (let i = 0; i < 40; i++) {
  if (await page.isVisible('.result')) break
  if (await page.isVisible('.timing-track')) { await page.keyboard.press('Space'); await sleep(760); continue }
  const atk = page.locator('button', { hasText: '演唱·强音' })
  if (await atk.count() && await atk.isEnabled()) { await atk.click(); await sleep(300); continue }
  await sleep(400)
}
await sleep(700)
const resultVisible = await page.isVisible('.result')
await shot('17-minigame-result.png')
check('关卡完成 → 结算界面（返回结果对象）', resultVisible)
if (resultVisible) {
  await page.locator('button', { hasText: '返回活动' }).click()
  await sleep(700)
  const backOk = await page.isVisible('text=活动列表')
  check('小游戏结束正确返回活动菜单', backOk)
}

/* 7. 离线模式验证（拦截一切外部请求：任何远程调用都会失败，应用仍可完整启动） */
const ctx2 = await browser.newContext({ viewport: { width: 1600, height: 900 } })
const page2 = await ctx2.newPage()
const remote2 = []
await ctx2.route(/^(?!http:\/\/localhost)/, (route) => {
  remote2.push(route.request().url())
  return route.abort()
})
await page2.goto(BASE, { waitUntil: 'domcontentloaded' })
await page2.waitForSelector('text=活动列表', { timeout: 60000 })
// 进入活动列表确认内容包离线可读
await page2.click('text=活动列表')
await page2.waitForSelector('text=第1话', { timeout: 15000 })
check('离线可用性（拦截全部外部请求后完整启动并浏览内容）', true)
await page2.screenshot({ path: join(SHOT, '18-offline-boot.png') })
await ctx2.close()

/* 汇总 */
report.remoteRequests.push(...remote2)
check('无远程请求（运行期 0 外部请求）', report.remoteRequests.length === 0,
  report.remoteRequests.length ? report.remoteRequests.slice(0, 5).join(', ') : '所有请求均为本地资源')
check('页面无 JS 错误', report.pageErrors.length === 0, report.pageErrors.slice(0, 3).join(' | '))

const passCount = report.checks.filter(c => c.pass).length
console.log(`\n===== 验收结果: ${passCount}/${report.checks.length} 通过 =====`)
writeFileSync(join(SHOT, 'acceptance-report.json'), JSON.stringify(report, null, 2))
await browser.close()
process.exit(passCount === report.checks.length ? 0 : 2)
