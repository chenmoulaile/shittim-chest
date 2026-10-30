/** ============================================================
 *  SHITTIM CHEST · 清单与内容 DSL 类型定义
 *  所有内容单元均由本地 manifest.json 驱动（验收项：清单驱动）
 *  ============================================================ */

/* ---------------- 清单 ---------------- */
export type ActivityStatus = 'active' | 'recap'
export type UnitType = 'story' | 'bond' | 'momotalk' | 'minigame'

export interface ManifestAssetItem { alias: string; src: string }
export interface ManifestPixiBundle { name: string; assets: ManifestAssetItem[] }

export interface ManifestUnit {
  id: string
  type: UnitType
  order: number
  status: 'active' | 'recap'
  title: string
  script?: string
  config?: string | null
  minigameType?: string
  studentId?: string
  unlockAfter?: string | null
}

export interface ActivityMeta {
  category: string
  eventId: string
  order: number
  status: ActivityStatus
  title: string
  titleEn?: string
  summary?: string
  banner: string
  themeColor?: string
  bgm?: string
  cast?: string[]
}

export interface ActivityEntry {
  id: string
  source: 'global'
  asOf: string
  meta: ActivityMeta
  assets: { bundles: string[]; characterTable: string | null }
  units: ManifestUnit[]
}

export interface ContentManifest {
  schemaVersion: number
  generatedAt: string
  audio: Record<string, string>
  pixi: { bundles: ManifestPixiBundle[] }
  activities: ActivityEntry[]
}

/* ---------------- 角色 ---------------- */
export interface CharacterMeta {
  name: string
  shortName?: string
  color: string
  sprites: Record<string, string>
  avatar: string | null
  voices: string[]
}
export type CharacterTable = Record<string, CharacterMeta>

/* ---------------- 剧情 DSL ---------------- */
export type StoryPosition = 'left' | 'center' | 'right'

export type StoryNode =
  | { type: 'title'; text: string; sub?: string }
  | { type: 'bg'; asset: string; effect?: 'fade' | 'cut' }
  | { type: 'bgm'; asset: string }
  | { type: 'stopBgm' }
  | { type: 'enter'; char: string; position: StoryPosition; emotion?: string }
  | { type: 'exit'; char: string }
  | { type: 'emotion'; char: string; emotion: string }
  | { type: 'say'; char?: string; text: string; voice?: string; effect?: 'shake' | 'flash' }
  | { type: 'narrate'; text: string }
  | { type: 'choice'; prompt?: string; options: { text: string; goto?: string; flag?: string }[] }
  | { type: 'label'; name: string }
  | { type: 'jump'; to: string }
  | { type: 'fx'; effect: 'shake' | 'flash' | 'hearts' | 'notes' }
  | { type: 'transition'; mode: 'out' | 'in' | 'outIn'; color?: string }
  | { type: 'cg'; asset: string; effect?: 'fade' }
  | { type: 'wait'; ms: number }
  | { type: 'end' }

export interface StoryScript {
  id: string
  title: string
  bond?: boolean
  recap?: boolean
  nodes: StoryNode[]
}

/* ---------------- 桃信 DSL ---------------- */
export interface MomotalkOption { text: string; goto: string }
export interface MomotalkMessage {
  id: string
  type: 'msg' | 'options' | 'bond'
  from?: 'student' | 'player'
  text?: string
  image?: string
  voice?: string
  /** 选项分支：跳转到 goto 后线性播放，直到遇到 id === merge 的消息汇合 */
  merge?: string
  options?: MomotalkOption[]
  storyUnitId?: string
}
export interface MomotalkThread {
  studentId: string
  title: string
  avatar: string
  messages: MomotalkMessage[]
}
export interface MomotalkScript { threads: MomotalkThread[] }

/* ---------------- 小游戏配置 ---------------- */
export interface MinigameWave {
  name: string
  sprite: string
  hp: number
  atk: number
  boss?: boolean
}
export interface MinigameLevel {
  id: string
  title: string
  bg: string
  bgm: string
  waves: MinigameWave[]
  rank: { S: number; A: number; B: number }
}
export interface MinigameConfig {
  gameTitle: string
  intro: string
  player: { id: string; name: string; maxHp: number; atk: number; sprite: string }
  supports: { id: string; name: string; skill: string; sprite: string; desc: string }[]
  timing: { sweepSec: number; windowPerfect: number; windowGood: number }
  scoreRules: { baseWin: number; perPerfect: number; perTurnPenalty: number; hpBonusRate: number }
  levels: MinigameLevel[]
}
