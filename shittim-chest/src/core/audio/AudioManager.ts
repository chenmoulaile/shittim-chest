/**
 * 音频管理器：BGM / SFX / 语音，全部来自本地内容包（HTMLAudio，无外部请求）
 */
export class AudioManager {
  private files = new Map<string, string>()
  private bgm: HTMLAudioElement | null = null
  private bgmAlias = ''
  private voice: HTMLAudioElement | null = null
  private cache = new Map<string, HTMLAudioElement>()
  bgmEnabled = true
  voiceEnabled = true

  setFiles(map: Record<string, string>): void {
    for (const [k, v] of Object.entries(map)) this.files.set(k, v)
  }

  private url(alias: string): string | null {
    return this.files.get(alias) ?? null
  }

  private element(alias: string): HTMLAudioElement | null {
    const u = this.url(alias)
    if (!u) return null
    let el = this.cache.get(u)
    if (!el) {
      el = new Audio(u)
      el.preload = 'auto'
      this.cache.set(u, el)
    }
    return el
  }

  playBgm(alias: string): void {
    if (!this.bgmEnabled) { this.bgmAlias = alias; return }
    if (this.bgmAlias === alias && this.bgm && !this.bgm.paused) return
    this.stopBgm()
    const el = this.element(alias)
    if (!el) return
    el.loop = true
    el.volume = 0.32
    el.play().catch(() => {/* 首次交互前可能被浏览器拦截，忽略 */})
    this.bgm = el
    this.bgmAlias = alias
  }

  stopBgm(): void {
    if (this.bgm) { this.bgm.pause(); this.bgm = null; this.bgmAlias = '' }
  }

  resumeBgm(): void {
    if (this.bgmEnabled && this.bgmAlias) { const a = this.bgmAlias; this.bgm = null; this.playBgm(a) }
  }

  setBgmEnabled(on: boolean): void {
    this.bgmEnabled = on
    if (!on) this.stopBgm()
    else this.resumeBgm()
  }

  playSfx(alias: string): void {
    const el = this.element(alias)
    if (!el) return
    el.currentTime = 0
    el.volume = 0.5
    el.play().catch(() => {})
  }

  playVoice(alias: string): void {
    if (!this.voiceEnabled) return
    if (this.voice) this.voice.pause()
    const el = this.element(alias)
    if (!el) return
    el.currentTime = 0
    el.volume = 0.85
    el.play().catch(() => {})
    this.voice = el
  }

  setVoiceEnabled(on: boolean): void {
    this.voiceEnabled = on
    if (!on && this.voice) this.voice.pause()
  }
}

export const audioManager = new AudioManager()
