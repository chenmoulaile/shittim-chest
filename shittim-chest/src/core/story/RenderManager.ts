import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import type { CharacterMeta, StoryPosition } from '../manifest/types'
import { DataResolver } from './DataResolver'
import { tween, easeOutCubic, wait } from '../utils'

const W = 1280
const H = 720
const POS_X: Record<StoryPosition, number> = { left: 310, center: 640, right: 970 }
const CHAR_H = 545

interface CharInstance {
  id: string
  container: Container
  sprite: Sprite
  meta: CharacterMeta
  emotion: string
}

/**
 * RenderManager：PixiJS v8 渲染管理（背景 / 立绘 / CG / 特效 / 转场）
 * （对齐 ba-story-player 的 RenderManager 职责划分）
 */
export class RenderManager {
  app = new Application()
  private bg!: Sprite
  private bgLayer = new Container()
  private charLayer = new Container()
  private fxLayer = new Container()
  private cgLayer = new Container()
  private overlayLayer = new Container()
  private chars = new Map<string, CharInstance>()
  private cg: Sprite | null = null
  private overlay = new Graphics()
  private resolver = new DataResolver()
  private shaking = false
  ready = false

  async init(canvas: HTMLCanvasElement): Promise<void> {
    await this.app.init({
      canvas,
      width: W,
      height: H,
      background: '#0b1526',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })
    this.app.stage.addChild(this.bgLayer, this.charLayer, this.fxLayer, this.cgLayer, this.overlayLayer)
    this.overlay.rect(0, 0, W, H).fill(0x000000)
    this.overlay.alpha = 0
    this.overlayLayer.addChild(this.overlay)
    this.ready = true
  }

  /* ---------------- 背景 ---------------- */
  async setBg(alias: string, effect: 'fade' | 'cut' = 'fade', instant = false): Promise<void> {
    const tex = await this.resolver.texture(alias)
    if (!this.ready) return // 视图已在加载期间卸载
    const next = new Sprite(tex)
    const s = Math.max(W / tex.width, H / tex.height)
    next.scale.set(s)
    next.x = (W - tex.width * s) / 2
    next.y = (H - tex.height * s) / 2
    if (effect === 'cut' || instant) {
      if (this.bg && !this.bg.destroyed) this.bg.destroy()
      this.bg = next
      this.bgLayer.addChild(next)
      return
    }
    next.alpha = 0
    this.bgLayer.addChild(next)
    await tween(420, (t) => { next.alpha = t }, easeOutCubic)
    if (!this.ready) return
    if (this.bg && !this.bg.destroyed) this.bg.destroy()
    this.bg = next
  }

  /* ---------------- CG ---------------- */
  async setCg(alias: string, instant = false): Promise<void> {
    const tex = await this.resolver.texture(alias)
    if (!this.ready) return
    const sp = new Sprite(tex)
    const s = Math.max(W / tex.width, H / tex.height)
    sp.scale.set(s)
    sp.x = (W - tex.width * s) / 2
    sp.y = (H - tex.height * s) / 2
    sp.alpha = instant ? 1 : 0
    this.cgLayer.addChild(sp)
    this.cg = sp
    if (!instant) await tween(500, (t) => { sp.alpha = t }, easeOutCubic)
  }

  async clearCg(instant = false): Promise<void> {
    if (!this.cg) return
    const sp = this.cg
    this.cg = null
    if (instant) { if (!sp.destroyed) sp.destroy(); return }
    await tween(400, (t) => { sp.alpha = 1 - t })
    if (!sp.destroyed) sp.destroy()
  }

  /* ---------------- 立绘 ---------------- */
  async enterChar(id: string, meta: CharacterMeta, emotion: string, position: StoryPosition, instant = false): Promise<void> {
    const alias = meta.sprites[emotion] ?? Object.values(meta.sprites)[0]
    const tex = await this.resolver.texture(alias)
    if (!this.ready) return
    const container = new Container()
    const sprite = new Sprite(tex)
    sprite.anchor.set(0.5, 1)
    const s = CHAR_H / tex.height
    sprite.scale.set(s)
    container.addChild(sprite)
    const targetX = POS_X[position]
    container.x = targetX
    container.y = H - 12
    container.alpha = instant ? 1 : 0
    this.charLayer.addChild(container)
    this.chars.set(id, { id, container, sprite, meta, emotion })
    this.applySpeakDim(null)
    if (instant) return
    const fromX = targetX + (position === 'right' ? 130 : position === 'left' ? -130 : 0)
    await tween(430, (t) => {
      container.alpha = t
      container.x = fromX + (targetX - fromX) * t
    }, easeOutCubic)
  }

  async exitChar(id: string, instant = false): Promise<void> {
    const inst = this.chars.get(id)
    if (!inst) return
    this.chars.delete(id)
    if (instant) { if (!inst.container.destroyed) inst.container.destroy({ children: true }); return }
    const fromX = inst.container.x
    await tween(360, (t) => {
      inst.container.alpha = 1 - t
      inst.container.x = fromX + (id === 'mari' ? 0 : fromX < W / 2 ? -90 : 90) * t
    }, easeOutCubic)
    if (!inst.container.destroyed) inst.container.destroy({ children: true })
    this.applySpeakDim(null)
  }

  async setEmotion(id: string, emotion: string): Promise<void> {
    const inst = this.chars.get(id)
    if (!inst) return
    const alias = inst.meta.sprites[emotion]
    if (!alias || inst.emotion === emotion) return
    inst.emotion = emotion
    inst.sprite.texture = await this.resolver.texture(alias)
  }

  setSpeaking(id: string | null): void {
    this.applySpeakDim(id)
  }

  private applySpeakDim(speaker: string | null): void {
    for (const [key, inst] of this.chars) {
      if (speaker && key !== speaker) {
        inst.container.alpha = 0.72
        inst.sprite.tint = 0x9aa2b8
        inst.container.y = H - 12
      } else {
        inst.container.alpha = 1
        inst.sprite.tint = 0xffffff
      }
    }
  }

  hasChar(id: string): boolean { return this.chars.has(id) }

  /* ---------------- 特效 ---------------- */
  async shake(instant = false): Promise<void> {
    if (instant) return
    this.shaking = true
    const dur = 420
    await tween(dur, (t) => {
      const d = (1 - t) * 11
      this.charLayer.x = Math.sin(t * 46) * d
      this.bgLayer.x = Math.sin(t * 46 + 1) * d * 0.7
    })
    if (!this.ready) return // 视图已卸载，层级已随应用销毁
    this.charLayer.x = 0
    this.bgLayer.x = 0
    this.shaking = false
  }

  async flash(instant = false): Promise<void> {
    if (instant) return
    const g = new Graphics().rect(0, 0, W, H).fill(0xffffff)
    g.alpha = 0
    this.overlayLayer.addChild(g)
    await tween(90, (t) => { g.alpha = 0.55 * t })
    await tween(320, (t) => { g.alpha = 0.55 * (1 - t) })
    g.destroy()
  }

  async fx(effect: 'hearts' | 'notes', instant = false): Promise<void> {
    if (instant) return
    const alias = effect === 'hearts' ? 'fx_heart' : 'fx_note'
    let tex: Texture
    try { tex = await Assets.load(alias) } catch { return }
    for (let i = 0; i < 10; i++) {
      if (!this.ready) return // 视图已卸载，停止继续生成粒子
      const sp = new Sprite(tex)
      sp.anchor.set(0.5)
      sp.scale.set(0.8 + Math.random() * 0.9)
      const startX = 180 + Math.random() * (W - 360)
      const startY = H - 130 - Math.random() * 160
      sp.x = startX
      sp.y = startY
      sp.alpha = 0
      this.fxLayer.addChild(sp)
      const drift = (Math.random() - 0.5) * 130
      const dur = 1100 + Math.random() * 700
      tween(dur, (t) => {
        sp.alpha = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85
        sp.y = startY - t * 240
        sp.x = startX + Math.sin(t * Math.PI * 2) * drift * 0.4 + drift * t * 0.4
        sp.rotation = Math.sin(t * Math.PI * 2) * 0.4
      }).then(() => { if (!sp.destroyed) sp.destroy() })
      await wait(70)
    }
  }

  /* ---------------- 转场 ---------------- */
  async transition(mode: 'out' | 'in' | 'outIn', instant = false): Promise<void> {
    if (mode === 'out' || mode === 'outIn') {
      if (instant) this.overlay.alpha = 1
      else await tween(430, (t) => { this.overlay.alpha = t })
    }
    if (mode === 'outIn') await wait(160)
    if (mode === 'in' || mode === 'outIn') {
      if (instant) this.overlay.alpha = 0
      else await tween(520, (t) => { this.overlay.alpha = 1 - t }, easeOutCubic)
    }
  }

  /* ---------------- 浮动文字（小游戏等复用） ---------------- */
  floatText(x: number, y: number, text: string, color = '#ffffff'): void {
    if (!this.ready) return
    const t = new Text({
      text,
      style: { fontFamily: 'Noto Sans SC, sans-serif', fontSize: 30, fontWeight: '700', fill: color, stroke: { color: '#101828', width: 4 } },
    })
    t.anchor.set(0.5)
    t.x = x
    t.y = y
    this.fxLayer.addChild(t)
    tween(850, (p) => {
      t.y = y - p * 70
      t.alpha = 1 - p * p
    }).then(() => { if (!t.destroyed) t.destroy() })
  }

  destroy(): void {
    this.ready = false // 先置为不可用，阻止在途异步方法继续操作已销毁对象
    this.chars.clear()
    this.app.destroy(true, { children: true, texture: false })
  }
}
