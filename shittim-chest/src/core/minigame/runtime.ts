import type { Application, Texture } from 'pixi.js'
import type { MinigameConfig } from '../manifest/types'
import type { AudioManager } from '../audio/AudioManager'

/** ============================================================
 *  统一小游戏生命周期接口（蓝图硬性架构约束）
 *  - 每种玩法类型实现为独立模块，向 MinigameRegistry 注册自己
 *  - init(config, assets) / start() / pause() / resume() / getResult()
 *  ============================================================ */

export type MinigamePhase =
  | 'intro' | 'select' | 'timing' | 'resolve' | 'wavebreak' | 'result' | 'defeat'

export interface MinigameSnapshot {
  phase: MinigamePhase
  levelIndex: number
  waveIndex: number
  waveTotal: number
  hasNextLevel: boolean
  levelTitle: string
  gameTitle: string
  enemyName: string
  enemyIsBoss: boolean
  enemyHp: number
  enemyMaxHp: number
  playerHp: number
  playerMaxHp: number
  playerAtk: number
  shield: number
  ult: number
  combo: number
  perfects: number
  turns: number
  incoming: number
  timingT: number
  timingKind: 'attack' | 'heal' | 'ult'
  log: string[]
  score: number
  rank: 'S' | 'A' | 'B' | 'C' | '-'
}

export interface MinigameResult {
  cleared: boolean
  score: number
  rank: 'S' | 'A' | 'B' | 'C' | '-'
  levelId: string
  perfects: number
  turns: number
}

export interface MinigameContext {
  app: Application
  config: MinigameConfig
  texture(alias: string): Texture
  audio: AudioManager
  onState(snapshot: MinigameSnapshot): void
}

export interface MinigameModule {
  init(ctx: MinigameContext): Promise<void>
  start(): void
  pause(): void
  resume(): void
  destroy(): void
  getResult(): MinigameResult | null
  /** UI → 游戏输入：attack / heal / ult / timing / next-level / retry */
  command(cmd: string): void
}

export type MinigameFactory = () => MinigameModule

/** 模块化注册表 */
const registry = new Map<string, MinigameFactory>()

export function registerMinigame(type: string, factory: MinigameFactory): void {
  if (registry.has(type)) console.warn(`[minigame] 类型重复注册: ${type}`)
  registry.set(type, factory)
}

export function createMinigame(type: string): MinigameModule | null {
  const factory = registry.get(type)
  if (!factory) {
    console.warn(`[minigame] 未注册的小游戏类型: ${type}`)
    return null
  }
  return factory()
}

export function registeredTypes(): string[] {
  return [...registry.keys()]
}
