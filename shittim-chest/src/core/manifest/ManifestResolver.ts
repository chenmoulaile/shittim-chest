import type {
  ActivityEntry, CharacterTable, ContentManifest, ManifestUnit,
  MomotalkScript, StoryScript, MinigameConfig,
} from './types'

const CONTENT_BASE = './content/'

/** 清单解析器：读取本地 manifest.json，提供活动/内容单元查询（V1 不支持热更新） */
export class ManifestResolver {
  private _manifest!: ContentManifest
  private aliasIndex = new Map<string, string>()

  async load(): Promise<ContentManifest> {
    const res = await fetch(CONTENT_BASE + 'manifest.json')
    if (!res.ok) throw new Error(`manifest.json 加载失败: ${res.status}`)
    const json = (await res.json()) as ContentManifest
    this.validate(json)
    this._manifest = json
    this.aliasIndex.clear()
    for (const b of json.pixi.bundles) for (const a of b.assets) this.aliasIndex.set(a.alias, a.src)
    return json
  }

  get manifest(): ContentManifest { return this._manifest }

  get activities(): ActivityEntry[] {
    return [...this._manifest.activities].sort((a, b) => a.meta.order - b.meta.order)
  }

  activity(id: string): ActivityEntry {
    const a = this._manifest.activities.find(x => x.id === id)
    if (!a) throw new Error(`活动不存在: ${id}`)
    return a
  }

  unit(activityId: string, unitId: string): ManifestUnit {
    const u = this.activity(activityId).units.find(x => x.id === unitId)
    if (!u) throw new Error(`内容单元不存在: ${unitId}`)
    return u
  }

  audioUrl(alias: string): string | null {
    const rel = this._manifest.audio[alias]
    return rel ? CONTENT_BASE + rel : null
  }

  /** 供 <img>/CSS 使用的本地资源地址（完全离线） */
  srcOf(alias: string): string {
    const rel = this.aliasIndex.get(alias)
    if (!rel) throw new Error(`资源别名不存在: ${alias}`)
    return CONTENT_BASE + rel
  }

  /** recap 活动隐藏小游戏入口（验收项：状态合规性） */
  isUnitVisible(unit: ManifestUnit, activity: ActivityEntry): boolean {
    if (activity.meta.status === 'recap' && unit.type === 'minigame') return false
    return true
  }

  async loadStory(unit: ManifestUnit): Promise<StoryScript> {
    const res = await fetch(CONTENT_BASE + unit.script)
    if (!res.ok) throw new Error(`剧情脚本加载失败: ${unit.script}`)
    return await res.json() as StoryScript
  }

  async loadMomotalk(unit: ManifestUnit): Promise<MomotalkScript> {
    const res = await fetch(CONTENT_BASE + unit.script)
    return await res.json() as MomotalkScript
  }

  async loadMinigameConfig(unit: ManifestUnit): Promise<MinigameConfig> {
    if (!unit.config) throw new Error('小游戏缺少配置文件')
    const res = await fetch(CONTENT_BASE + unit.config)
    return await res.json() as MinigameConfig
  }

  async loadCharacterTable(activity: ActivityEntry): Promise<CharacterTable> {
    if (!activity.assets.characterTable) return {}
    const res = await fetch(CONTENT_BASE + activity.assets.characterTable)
    return await res.json() as CharacterTable
  }

  private validate(m: ContentManifest): void {
    if (!m.schemaVersion || !Array.isArray(m.activities)) throw new Error('清单格式非法')
    for (const a of m.activities) {
      if (a.source !== 'global') throw new Error(`活动 ${a.id} 缺少 source: "global"`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(a.asOf)) throw new Error(`活动 ${a.id} 的 asOf 字段必须为 YYYY-MM-DD`)
      const ids = new Set<string>()
      for (const u of a.units) {
        if (ids.has(u.id)) throw new Error(`内容单元 id 重复: ${u.id}`)
        ids.add(u.id)
      }
    }
  }
}

export const manifestResolver = new ManifestResolver()
