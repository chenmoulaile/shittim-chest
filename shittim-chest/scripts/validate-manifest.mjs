/**
 * 检查点脚本：内容清单与内容包完整性校验
 * 用法：npm run content:validate
 * 退出码非 0 表示校验失败（CI / 提交前检查用）
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const errors = []
const warnings = []
let checks = 0

const ok = (cond, msg) => { checks++; if (!cond) errors.push(msg) }
const warn = (cond, msg) => { if (!cond) warnings.push(msg) }

const mPath = join(ROOT, 'public', 'content', 'manifest.json')
ok(existsSync(mPath), 'manifest.json 不存在')
if (!existsSync(mPath)) {
  console.error(errors.join('\n'))
  process.exit(1)
}
const m = JSON.parse(readFileSync(mPath, 'utf8'))

// ---- 基本结构 ----
ok(typeof m.schemaVersion === 'number', 'schemaVersion 缺失')
ok(Array.isArray(m.activities) && m.activities.length > 0, 'activities 为空')
ok(typeof m.audio === 'object', 'audio 表缺失')
ok(Array.isArray(m.pixi?.bundles) && m.pixi.bundles.length > 0, 'pixi.bundles 缺失')

// ---- 每个活动 ----
const unitIds = new Set()
for (const a of m.activities) {
  ok(a.source === 'global', `[${a.id}] 缺少 source:"global"`)
  ok(/^\d{4}-\d{2}-\d{2}$/.test(a.asOf ?? ''), `[${a.id}] asOf 必须为 YYYY-MM-DD，实际: ${a.asOf}`)
  ok(['active', 'recap'].includes(a.meta?.status), `[${a.id}] meta.status 非法`)
  ok(typeof a.meta?.title === 'string' && a.meta.title, `[${a.id}] 缺少标题`)
  ok(Array.isArray(a.units) && a.units.length > 0, `[${a.id}] 无内容单元`)

  for (const u of a.units ?? []) {
    const key = `${a.id}/${u.id}`
    ok(!unitIds.has(u.id), `内容单元 id 重复: ${u.id}`)
    unitIds.add(u.id)
    ok(['story', 'bond', 'momotalk', 'minigame'].includes(u.type), `[${key}] type 非法: ${u.type}`)
    ok(['active', 'recap'].includes(u.status), `[${key}] status 非法`)
    if (u.unlockAfter) ok(unitIds.has(u.unlockAfter) || (a.units ?? []).some(x => x.id === u.unlockAfter),
      `[${key}] unlockAfter 指向不存在的单元: ${u.unlockAfter}`)

    if (u.type === 'story' || u.type === 'bond' || u.type === 'momotalk') {
      ok(typeof u.script === 'string', `[${key}] 缺少 script 指针`)
      if (u.script) {
        const p = join(ROOT, 'public', 'content', u.script)
        ok(existsSync(p), `[${key}] 脚本文件不存在: ${u.script}`)
        if (existsSync(p)) {
          try { JSON.parse(readFileSync(p, 'utf8')) } catch (e) { errors.push(`[${key}] 脚本 JSON 解析失败: ${e.message}`) }
        }
      }
    }
    if (u.type === 'minigame') {
      ok(typeof u.minigameType === 'string', `[${key}] 缺少 minigameType`)
      if (u.config) {
        const p = join(ROOT, 'public', 'content', u.config)
        ok(existsSync(p), `[${key}] 配置文件不存在: ${u.config}`)
        if (existsSync(p)) {
          try {
            const cfg = JSON.parse(readFileSync(p, 'utf8'))
            ok(Array.isArray(cfg.levels) && cfg.levels.length > 0, `[${key}] 关卡配置为空`)
            ok(cfg.player && cfg.player.maxHp > 0, `[${key}] player 配置非法`)
          } catch (e) { errors.push(`[${key}] 配置解析失败: ${e.message}`) }
        }
      }
    }
    if (u.type === 'story' || u.type === 'bond') {
      // 剧本节点检查
      if (u.script && existsSync(join(ROOT, 'public', 'content', u.script))) {
        const script = JSON.parse(readFileSync(join(ROOT, 'public', 'content', u.script), 'utf8'))
        ok(Array.isArray(script.nodes) && script.nodes.length > 0, `[${key}] 剧本 nodes 为空`)
        const labels = new Set(script.nodes.filter(n => n.type === 'label').map(n => n.name))
        const endIdx = script.nodes.findIndex(n => n.type === 'end')
        ok(endIdx >= 0, `[${key}] 缺少 end 节点`)
        for (const n of script.nodes) {
          if (n.type === 'jump') ok(labels.has(n.to), `[${key}] jump 指向不存在的 label: ${n.to}`)
          if (n.type === 'choice') {
            for (const o of n.options) ok(o.goto === undefined || labels.has(o.goto),
              `[${key}] 选项指向不存在的 label: ${o.goto}`)
          }
          if ((n.type === 'bg' || n.type === 'cg') && !n.asset) errors.push(`[${key}] ${n.type} 节点缺少 asset`)
          if (n.type === 'say') ok(typeof n.text === 'string' && n.text.length > 0, `[${key}] say 节点文本为空`)
        }
      }
    }
  }

  // recap 活动的入口规则：仍可包含 minigame 单元（由运行时隐藏），但提示
  if (a.meta.status === 'recap') {
    warn(!(a.units ?? []).some(u => u.type === 'minigame' && u.status === 'active'), `[${a.id}] recap 活动的 minigame 将在运行时隐藏（规则校验在 UI 层）`)
  }
}

// ---- 资源文件存在性 ----
const aliasSet = new Set()
for (const b of m.pixi.bundles) {
  ok(typeof b.name === 'string', 'pixi bundle 缺少 name')
  for (const asset of b.assets) {
    ok(!aliasSet.has(asset.alias), `资源别名重复: ${asset.alias}`)
    aliasSet.add(asset.alias)
    const p = join(ROOT, 'public', 'content', asset.src)
    ok(existsSync(p), `bundle [${b.name}] 资源不存在: ${asset.src}`)
  }
}

// ---- 音频 ----
for (const [alias, rel] of Object.entries(m.audio ?? {})) {
  const p = join(ROOT, 'public', 'content', rel)
  ok(existsSync(p), `音频不存在: ${alias} → ${rel}`)
}

// ---- 剧本引用的资源必须在 bundles 内 ----
for (const a of m.activities) {
  for (const u of a.units ?? []) {
    if ((u.type === 'story' || u.type === 'bond') && u.script) {
      const p = join(ROOT, 'public', 'content', u.script)
      if (!existsSync(p)) continue
      const script = JSON.parse(readFileSync(p, 'utf8'))
      for (const n of script.nodes) {
        if (n.type === 'bg' || n.type === 'cg') {
          ok(aliasSet.has(n.asset), `[${a.id}/${u.id}] 剧本引用了未注册资源: ${n.asset}`)
        }
        if (n.type === 'enter' || n.type === 'emotion') {
          // 角色级检查在运行时结合 characters.json 进行
        }
      }
    }
  }
}

// ---- 汇总 ----
console.log(`\n[content:validate] 共执行 ${checks} 项检查`)
if (warnings.length) {
  console.log('Warnings:')
  for (const w of warnings) console.log('  ⚠ ' + w)
}
if (errors.length) {
  console.error('Errors:')
  for (const e of errors) console.error('  ✗ ' + e)
  process.exit(1)
}
console.log('✓ 内容清单与内容包校验全部通过')
