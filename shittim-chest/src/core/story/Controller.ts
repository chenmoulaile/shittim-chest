import type { CharacterTable, StoryNode, StoryScript } from '../manifest/types'
import type { RenderManager } from './RenderManager'
import type { AudioManager } from '../audio/AudioManager'

export interface StoryUiHooks {
  /** 文本行（say / narrate）——UI 启动打字机 */
  onSay(info: { name: string; color: string; text: string; narration: boolean }): void
  /** 章节标题黑屏（等待点击或自动） */
  onTitle(text: string, sub?: string): Promise<void>
  /** 弹出选项，resolve 选中项下标 */
  onChoice(prompt: string | undefined, options: { text: string; index: number }[]): Promise<number>
  /** 顶层章节名（顶栏显示） */
  onChapterTitle(title: string): void
  /** 进度（打字机/进度条用） */
  onProgress(done: number, total: number): void
  onEnded(): void
}

export interface StoryControllerOptions {
  render: RenderManager
  audio: AudioManager
  ui: StoryUiHooks
  characters: CharacterTable
  onFlag?: (flag: string) => void
}

/**
 * Controller：叙事内核——按时序推进脚本节点、管理等待与跳转、变量状态
 * （对齐 ba-story-player 的 Controller 职责划分）
 */
export class StoryController {
  private render: RenderManager
  private audio: AudioManager
  private ui: StoryUiHooks
  private characters: CharacterTable
  private onFlag?: (flag: string) => void

  private script: StoryScript | null = null
  private idx = 0
  private skipping = false
  private waitResolve: (() => void) | null = null
  private running = false
  private total = 0

  constructor(opts: StoryControllerOptions) {
    this.render = opts.render
    this.audio = opts.audio
    this.ui = opts.ui
    this.characters = opts.characters
    this.onFlag = opts.onFlag
  }

  /** 等待玩家点击/自动播放推进 */
  advance(): void {
    this.waitResolve?.()
    this.waitResolve = null
  }

  /** 跳过整章 */
  skipAll(): void {
    this.skipping = true
    this.advance()
  }

  private waitForUser(): Promise<void> {
    if (this.skipping || !this.running) return Promise.resolve()
    return new Promise((resolve) => { this.waitResolve = resolve })
  }

  private charMeta(id?: string) {
    if (!id) return null
    return this.characters[id] ?? null
  }

  async play(script: StoryScript): Promise<void> {
    this.script = script
    this.idx = 0
    this.skipping = false
    this.running = true
    this.total = script.nodes.length
    this.ui.onChapterTitle(script.title)
    try {
      while (this.idx < script.nodes.length && this.running) {
        const node = script.nodes[this.idx]
        this.idx += 1
        this.ui.onProgress(this.idx, this.total)
        await this.exec(node)
      }
    } finally {
      this.running = false
    }
    this.ui.onEnded()
  }

  stop(): void {
    this.running = false
    this.skipping = true
    this.advance()
  }

  private instant(): boolean { return this.skipping }

  private async exec(node: StoryNode): Promise<void> {
    const r = this.render
    switch (node.type) {
      case 'title':
        if (!this.instant()) await this.ui.onTitle(node.text, node.sub)
        break
      case 'bg':
        await r.setBg(node.asset, node.effect ?? 'fade', this.instant())
        break
      case 'bgm':
        if (!this.instant()) this.audio.playBgm(node.asset)
        break
      case 'stopBgm':
        this.audio.stopBgm()
        break
      case 'enter': {
        const meta = this.charMeta(node.char)
        if (meta) {
          const emotion = node.emotion ?? 'normal'
          await r.enterChar(node.char, meta, emotion, node.position, this.instant())
          r.setSpeaking(node.char)
        }
        break
      }
      case 'exit':
        await r.exitChar(node.char, this.instant())
        break
      case 'emotion':
        await r.setEmotion(node.char, node.emotion)
        break
      case 'say': {
        const meta = this.charMeta(node.char)
        if (node.char) r.setSpeaking(node.char)
        this.ui.onSay({
          name: meta?.name ?? (node.char ? node.char : ''),
          color: meta?.color ?? '#9fb6dd',
          text: node.text,
          narration: !node.char,
        })
        if (node.voice && !this.instant()) this.audio.playVoice(node.voice)
        if (node.effect === 'shake') await r.shake()
        if (node.effect === 'flash') await r.flash()
        await this.waitForUser()
        break
      }
      case 'narrate':
        this.ui.onSay({ name: '', color: '#9fb6dd', text: node.text, narration: true })
        await this.waitForUser()
        break
      case 'choice': {
        if (this.instant()) {
          // 跳过模式：默认选第一项并继续
          const first = node.options[0]
          if (first?.flag) this.onFlag?.(first.flag)
          if (first?.goto) this.jumpTo(first.goto)
          break
        }
        const options = node.options.map((o, i) => ({ text: o.text, index: i }))
        const picked = await this.ui.onChoice(node.prompt, options)
        const chosen = node.options[picked]
        if (chosen?.flag) this.onFlag?.(chosen.flag)
        if (chosen?.goto) {
          this.jumpTo(chosen.goto)
        }
        break
      }
      case 'label':
        break
      case 'jump':
        this.jumpTo(node.to)
        break
      case 'fx':
        if (node.effect === 'shake') await r.shake(this.instant())
        else if (node.effect === 'flash') await r.flash(this.instant())
        else await r.fx(node.effect, this.instant())
        break
      case 'transition':
        await r.transition(node.mode, this.instant())
        break
      case 'cg':
        await r.setCg(node.asset, this.instant())
        break
      case 'wait':
        if (!this.instant()) await new Promise((res) => setTimeout(res, node.ms))
        break
      case 'end':
        this.running = false
        break
    }
  }

  private jumpTo(label: string): void {
    if (!this.script) return
    const i = this.script.nodes.findIndex((n) => n.type === 'label' && n.name === label)
    if (i >= 0) this.idx = i + 1
    else console.warn(`[story] 未找到 label: ${label}`)
  }
}
