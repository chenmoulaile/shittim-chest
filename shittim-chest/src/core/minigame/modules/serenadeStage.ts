import { Container, Sprite, Text, Texture } from 'pixi.js'
import type { MinigameWave } from '../../manifest/types'
import {
  registerMinigame,
  type MinigameContext,
  type MinigameModule,
  type MinigameResult,
  type MinigameSnapshot,
} from '../runtime'
import { tween, wait } from '../../utils'

const W = 1280
const H = 720

interface EnemyState extends MinigameWave {
  maxHp: number
}

/**
 * 「先将她们的小夜曲」活动小游戏模块：serenade-stage
 * 回合制节拍协奏战——选择指令后进入节拍判定，
 * 在节拍标记进入高亮区时按下，可打出 PERFECT 暴击。
 */
class SerenadeStage implements MinigameModule {
  private ctx!: MinigameContext
  private root = new Container()
  private playerSp!: Sprite
  private sakuraSp!: Sprite
  private mineSp!: Sprite
  private enemyHolder = new Container()
  private enemySp: Sprite | null = null
  private titleText!: Text

  private levelIndex = 0
  private waveIndex = 0
  private playerHp = 100
  private shield = 0
  private ult = 0
  private combo = 0
  private perfects = 0
  private turns = 0
  private enemy: EnemyState | null = null
  private phase: MinigameSnapshot['phase'] = 'intro'
  private timingKind: 'attack' | 'heal' | 'ult' = 'attack'
  private timingStart = 0
  private timingHit = false
  private paused = false
  private pauseAt = 0
  private started = false
  private result: MinigameResult | null = null
  private log: string[] = []
  private score = 0
  private bobT = 0

  async init(ctx: MinigameContext): Promise<void> {
    this.ctx = ctx
    this.levelIndex = 0
    this.buildStage()
    this.applyLevel(0)
  }

  private buildStage(): void {
    const cfg = this.ctx.config
    this.root.removeChildren().forEach((c) => c.destroy({ children: true }))

    const bg = new Sprite(this.ctx.texture(cfg.levels[0].bg))
    const s = Math.max(W / bg.texture.width, H / bg.texture.height)
    bg.scale.set(s)
    bg.x = (W - bg.texture.width * s) / 2
    bg.y = (H - bg.texture.height * s) / 2
    this.root.addChild(bg)

    this.playerSp = new Sprite(this.ctx.texture(cfg.player.sprite))
    this.playerSp.anchor.set(0.5, 1)
    this.fitHeight(this.playerSp, 430)
    this.playerSp.x = 340
    this.playerSp.y = 668
    this.root.addChild(this.playerSp)

    const sakura = cfg.supports.find((x) => x.id === 'sakurako')
    const mine = cfg.supports.find((x) => x.id === 'mine')
    if (sakura) {
      this.sakuraSp = new Sprite(this.ctx.texture(sakura.sprite))
      this.sakuraSp.anchor.set(0.5, 1)
      this.fitHeight(this.sakuraSp, 250)
      this.sakuraSp.x = 150
      this.sakuraSp.y = 640
      this.sakuraSp.alpha = 0.96
      this.root.addChild(this.sakuraSp)
    }
    if (mine) {
      this.mineSp = new Sprite(this.ctx.texture(mine.sprite))
      this.mineSp.anchor.set(0.5, 1)
      this.fitHeight(this.mineSp, 250)
      this.mineSp.x = 255
      this.mineSp.y = 660
      this.mineSp.alpha = 0.96
      this.root.addChild(this.mineSp)
    }

    this.enemyHolder.x = 920
    this.enemyHolder.y = 650
    this.root.addChild(this.enemyHolder)

    this.titleText = new Text({
      text: cfg.gameTitle,
      style: { fontFamily: 'Noto Sans SC, sans-serif', fontSize: 30, fontWeight: '700', fill: '#cfe4ff', stroke: { color: '#101828', width: 5 } },
    })
    this.titleText.x = 40
    this.titleText.y = 36
    this.root.addChild(this.titleText)
  }

  private fitHeight(sp: Sprite, h: number): void {
    sp.scale.set(h / sp.texture.height)
  }

  private applyLevel(index: number): void {
    this.levelIndex = index
    const level = this.ctx.config.levels[index]
    this.playerHp = this.ctx.config.player.maxHp
    this.shield = 0
    this.ult = 0
    this.combo = 0
    this.perfects = 0
    this.turns = 0
    this.waveIndex = 0
    this.result = null
    this.score = 0
    this.log = []
    this.phase = 'intro'
    const bgTex = this.ctx.texture(level.bg)
    const bg = this.root.children[0] as Sprite
    if (bg.texture !== bgTex) {
      const s = Math.max(W / bgTex.width, H / bgTex.height)
      bg.texture = bgTex
      bg.scale.set(s)
      bg.x = (W - bgTex.width * s) / 2
      bg.y = (H - bgTex.height * s) / 2
    }
    this.titleText.text = `♪ ${level.title}`
    this.pushLog(`—— ${level.title} ——`)
  }

  private spawnEnemy(): void {
    const level = this.ctx.config.levels[this.levelIndex]
    const wave = level.waves[this.waveIndex]
    this.enemy = { ...wave, maxHp: wave.hp }
    this.enemySp = null // 先清空引用，旧精灵随 removeChildren 销毁，避免 tick 触碰已销毁对象
    this.enemyHolder.removeChildren().forEach((c) => c.destroy({ children: true }))
    const sp = new Sprite(this.ctx.texture(wave.sprite))
    sp.anchor.set(0.5, 1)
    const h = wave.boss ? 430 : wave.sprite.includes('diva') ? 330 : 265
    sp.scale.set(h / sp.texture.height)
    sp.y = 0
    this.enemySp = sp
    this.enemyHolder.addChild(sp)
    this.pushLog(`${wave.name} 出现了！`)
  }

  private pushLog(msg: string): void {
    this.log.push(msg)
    if (this.log.length > 4) this.log.shift()
  }

  /* ---------------- 生命周期 ---------------- */
  start(): void {
    if (this.started) return
    this.started = true
    this.ctx.app.stage.addChild(this.root)
    this.ctx.app.ticker.add(this.tick)
    const level = this.ctx.config.levels[this.levelIndex]
    this.ctx.audio.playBgm(level.bgm)
    void (async () => {
      await wait(900)
      if (this.paused) return
      this.spawnEnemy()
      this.phase = 'select'
      this.emit()
    })()
    this.emit()
  }

  pause(): void {
    if (this.paused) return
    this.paused = true
    this.pauseAt = performance.now()
    this.ctx.app.ticker.stop()
  }

  resume(): void {
    if (!this.paused) return
    this.paused = false
    this.timingStart += performance.now() - this.pauseAt
    this.ctx.app.ticker.start()
  }

  destroy(): void {
    this.ctx.app.ticker.remove(this.tick)
    this.root.destroy({ children: true })
    this.started = false
  }

  getResult(): MinigameResult | null {
    return this.result
  }

  command(cmd: string): void {
    if (this.paused) return
    switch (cmd) {
      case 'attack':
      case 'heal':
      case 'ult':
        if (this.phase !== 'select') return
        if (cmd === 'ult' && this.ult < 100) return
        this.beginTiming(cmd)
        break
      case 'timing':
        if (this.phase === 'timing' && !this.timingHit) this.resolveHit()
        break
      case 'retry':
        this.started = false
        this.ctx.app.ticker.remove(this.tick)
        this.applyLevel(this.levelIndex)
        this.start()
        break
      case 'next-level':
        if (this.levelIndex + 1 < this.ctx.config.levels.length) {
          this.started = false
          this.ctx.app.ticker.remove(this.tick)
          this.applyLevel(this.levelIndex + 1)
          this.start()
        }
        break
    }
  }

  /* ---------------- 战斗逻辑 ---------------- */
  private beginTiming(kind: 'attack' | 'heal' | 'ult'): void {
    this.phase = 'timing'
    this.timingKind = kind
    this.timingStart = performance.now()
    this.timingHit = false
    this.emit()
  }

  private timingT(): number {
    return (performance.now() - this.timingStart) / (this.ctx.config.timing.sweepSec * 1000)
  }

  private judge(): 'PERFECT' | 'GOOD' | 'MISS' {
    const t = this.timingT()
    const off = Math.abs(t - 0.5)
    if (off <= this.ctx.config.timing.windowPerfect) return 'PERFECT'
    if (off <= this.ctx.config.timing.windowGood) return 'GOOD'
    return 'MISS'
  }

  private resolveHit(autoMiss = false): void {
    if (this.timingHit) return
    this.timingHit = true
    const judge: 'PERFECT' | 'GOOD' | 'MISS' = autoMiss ? 'MISS' : this.judge()
    void this.applyPlayerAction(judge)
  }

  private async applyPlayerAction(judge: 'PERFECT' | 'GOOD' | 'MISS'): Promise<void> {
    const cfg = this.ctx.config
    const mult = judge === 'PERFECT' ? 1.6 : judge === 'GOOD' ? 1.0 : 0.5
    this.phase = 'resolve'

    if (judge === 'PERFECT') {
      this.perfects += 1
      this.combo += 1
      this.ctx.audio.playSfx('sfx_perfect')
      this.noteBurst(10)
    } else if (judge === 'GOOD') {
      this.combo += 1
      this.ult += 6
      this.ctx.audio.playSfx('sfx_confirm')
      this.noteBurst(5)
    } else {
      this.combo = 0
      this.ctx.audio.playSfx('sfx_hit')
    }
    this.ult = Math.min(100, this.ult + (judge === 'PERFECT' ? 26 : judge === 'GOOD' ? 12 : 4))

    if (this.timingKind === 'heal') {
      const heal = 22 + this.combo * 2
      this.playerHp = Math.min(cfg.player.maxHp, this.playerHp + heal)
      this.pushLog(`♪ 和声治愈：恢复 ${heal} HP（${judge}）`)
      this.float(this.playerSp.x, this.playerSp.y - 380, `+${heal}`, '#8fe0a8')
      this.ctx.audio.playSfx('sfx_heal')
    } else if (this.enemy) {
      const base = this.timingKind === 'ult' ? cfg.player.atk * 2.6 : cfg.player.atk
      const dmg = Math.max(1, Math.round(base * mult + this.combo * 0.6))
      this.enemy.hp -= dmg
      this.float(this.enemyHolder.x - 30, this.enemyHolder.y - (this.enemy.boss ? 430 : 300), `${dmg}`, judge === 'PERFECT' ? '#ffd257' : '#ffffff')
      this.pushLog(`${this.timingKind === 'ult' ? '☆ 终乐章' : '♪ 演唱·强音'}：造成 ${dmg} 伤害（${judge}${judge === 'PERFECT' ? ' ×' + this.combo + ' 连击' : ''}）`)
      this.shakeEnemy()
    }
    this.emit()
    const dead = this.enemy !== null && this.enemy.hp <= 0
    await wait(dead ? 200 : 620)

    if (this.enemy && this.enemy.hp <= 0) {
      await this.onWaveCleared()
      return
    }
    await this.enemyTurn()
  }

  private async onWaveCleared(): Promise<void> {
    const level = this.ctx.config.levels[this.levelIndex]
    this.pushLog(`♪ ${this.enemy?.name} 退场！`)
    this.enemy = null
    this.enemySp = null // 精灵已销毁，必须同步置空（tick 在波次间隔 800ms 内仍会运行）
    this.enemyHolder.removeChildren().forEach((c) => c.destroy({ children: true }))
    this.waveIndex += 1
    if (this.waveIndex < level.waves.length) {
      this.phase = 'wavebreak'
      this.emit()
      await wait(800)
      this.playerHp = Math.min(this.ctx.config.player.maxHp, this.playerHp + 10)
      this.spawnEnemy()
      this.phase = 'select'
      this.emit()
      return
    }
    // 关卡完成 → 结算
    const rules = this.ctx.config.scoreRules
    const hpBonus = Math.round((this.playerHp / this.ctx.config.player.maxHp) * rules.hpBonusRate) * 10
    this.score = Math.max(0, rules.baseWin + this.perfects * rules.perPerfect + hpBonus - Math.max(0, this.turns - 8) * rules.perTurnPenalty)
    const rank: 'S' | 'A' | 'B' | 'C' =
      this.score >= level.rank.S ? 'S' : this.score >= level.rank.A ? 'A' : this.score >= level.rank.B ? 'B' : 'C'
    this.result = { cleared: true, score: this.score, rank, levelId: level.id, perfects: this.perfects, turns: this.turns }
    this.phase = 'result'
    this.emit()
  }

  private async enemyTurn(): Promise<void> {
    if (!this.enemy) return
    await wait(260)
    let incoming = this.enemy.atk + Math.floor(Math.random() * 4)
    if (this.enemy.boss && this.enemy.hp < this.enemy.maxHp * 0.5) incoming += 4
    let absorbed = 0
    if (this.shield > 0) {
      absorbed = Math.min(this.shield, incoming)
      this.shield -= absorbed
      incoming -= absorbed
      if (absorbed > 0) this.pushLog(`✦ 应援护盾抵挡了 ${absorbed} 伤害`)
    }
    if (incoming > 0) {
      this.playerHp -= incoming
      this.ctx.audio.playSfx('sfx_hit')
      this.float(this.playerSp.x, this.playerSp.y - 400, `-${incoming}`, '#ff8fa0')
      this.pushLog(`${this.enemy.name} 的噪音攻击：-${incoming} HP`)
      this.shakeStage()
    }
    this.turns += 1
    // 支援被动
    this.playerHp = Math.min(this.ctx.config.player.maxHp, this.playerHp + 6) // 樱子：和声治愈
    if (this.turns % 3 === 0) {
      this.shield += 12 // 美祢：应援护盾
      this.pushLog('✦ 苍森美祢展开应援护盾！')
    }
    if (this.playerHp <= 0) {
      this.playerHp = 0
      this.result = { cleared: false, score: 0, rank: '-', levelId: this.ctx.config.levels[this.levelIndex].id, perfects: this.perfects, turns: this.turns }
      this.phase = 'defeat'
      this.emit()
      return
    }
    this.phase = 'select'
    this.emit()
  }

  /* ---------------- 表现 ---------------- */
  private float(x: number, y: number, text: string, color: string): void {
    const t = new Text({
      text,
      style: { fontFamily: 'Noto Sans SC, sans-serif', fontSize: 34, fontWeight: '800', fill: color, stroke: { color: '#101828', width: 5 } },
    })
    t.anchor.set(0.5)
    t.x = x
    t.y = y
    this.root.addChild(t)
    void tween(800, (p) => { t.y = y - p * 64; t.alpha = 1 - p * p }).then(() => { if (!t.destroyed) t.destroy() })
  }

  private noteBurst(n: number): void {
    let tex: Texture
    try { tex = this.ctx.texture('fx_note') } catch { return }
    for (let i = 0; i < n; i++) {
      const sp = new Sprite(tex)
      sp.anchor.set(0.5)
      sp.scale.set(0.6 + Math.random() * 0.8)
      sp.x = 340 + (Math.random() - 0.5) * 160
      sp.y = 400 + (Math.random() - 0.5) * 160
      this.root.addChild(sp)
      const dx = (Math.random() - 0.3) * 180
      void tween(700 + Math.random() * 400, (p) => {
        sp.x += dx * 0.02
        sp.y -= 2.4
        sp.alpha = 1 - p
        sp.rotation = p * 2
      }).then(() => { if (!sp.destroyed) sp.destroy() })
    }
  }

  private shakeEnemy(): void {
    if (!this.enemySp) return
    const sp = this.enemySp
    void tween(260, (t) => { sp.x = Math.sin(t * 40) * 12 * (1 - t) }).then(() => { if (!sp.destroyed) sp.x = 0 })
  }

  private shakeStage(): void {
    void tween(280, (t) => {
      this.root.x = Math.sin(t * 42) * 9 * (1 - t)
    }).then(() => { if (!this.root.destroyed) this.root.x = 0 })
  }

  private tick = (): void => {
    if (this.paused) return
    this.bobT += this.ctx.app.ticker.deltaMS / 1000
    const breathe = Math.sin(this.bobT * 2.1) * 0.012
    const bobY = Math.sin(this.bobT * 2.6) * 7
    if (this.playerSp && !this.playerSp.destroyed) this.playerSp.scale.y = (430 / this.playerSp.texture.height) * (1 + breathe)
    if (this.enemySp && !this.enemySp.destroyed) this.enemySp.y = bobY
    if (this.sakuraSp && !this.sakuraSp.destroyed) this.sakuraSp.scale.y = (250 / this.sakuraSp.texture.height) * (1 + Math.sin(this.bobT * 2.1 + 1) * 0.012)
    if (this.mineSp && !this.mineSp.destroyed) this.mineSp.scale.y = (250 / this.mineSp.texture.height) * (1 + Math.sin(this.bobT * 2.1 + 2) * 0.012)

    if (this.phase === 'timing') {
      const t = this.timingT()
      this.emit()
      if (t >= 1) this.resolveHit(true)
    }
  }

  /* ---------------- 状态快照 ---------------- */
  private emit(): void {
    const level = this.ctx.config.levels[this.levelIndex]
    this.ctx.onState({
      phase: this.phase,
      levelIndex: this.levelIndex,
      waveIndex: this.waveIndex,
      waveTotal: level.waves.length,
      hasNextLevel: this.levelIndex + 1 < this.ctx.config.levels.length,
      levelTitle: level.title,
      gameTitle: this.ctx.config.gameTitle,
      enemyName: this.enemy?.name ?? '',
      enemyIsBoss: !!this.enemy?.boss,
      enemyHp: Math.max(0, this.enemy?.hp ?? 0),
      enemyMaxHp: this.enemy?.maxHp ?? 1,
      playerHp: Math.max(0, this.playerHp),
      playerMaxHp: this.ctx.config.player.maxHp,
      playerAtk: this.ctx.config.player.atk,
      shield: this.shield,
      ult: this.ult,
      combo: this.combo,
      perfects: this.perfects,
      turns: this.turns,
      incoming: this.enemy ? this.enemy.atk : 0,
      timingT: this.phase === 'timing' ? this.timingT() : 0,
      timingKind: this.timingKind,
      log: [...this.log],
      score: this.score,
      rank: this.result?.rank ?? '-',
    })
  }
}

registerMinigame('serenade-stage', () => new SerenadeStage())
