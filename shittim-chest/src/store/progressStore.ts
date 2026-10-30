import { defineStore } from 'pinia'
import type { GameDatabase, ProgressRow } from '../core/db/Database'
import type { ManifestUnit, ActivityEntry } from '../core/manifest/types'

/** 阅读进度 / 小游戏通关状态 / 选项历史（SQLite 持久化） */
export const useProgressStore = defineStore('progress', {
  state: () => ({
    rows: {} as Record<string, ProgressRow>,
    db: null as GameDatabase | null,
  }),
  getters: {
    isCompleted: (s) => (unitId: string): boolean => !!s.rows[unitId]?.completed,
    bestScore: (s) => (unitId: string): number => s.rows[unitId]?.bestScore ?? 0,
  },
  actions: {
    async init(db: GameDatabase) {
      this.db = db
      this.rows = await db.allProgress()
    },
    async markComplete(unitId: string, score = 0) {
      await this.db?.markProgress(unitId, { completed: true, score: score || undefined })
      this.rows = await this.db!.allProgress()
    },
    async recordScore(unitId: string, score: number) {
      await this.db?.markProgress(unitId, { score })
      this.rows = await this.db!.allProgress()
    },
    async recordChoice(unitId: string, flag: string) {
      await this.db?.addFlag(unitId, flag)
    },
    /** 解锁判定：unlockAfter 链（验收项：桃信完整性 / 剧情播放的层级导航） */
    isUnlocked(unit: ManifestUnit): boolean {
      if (!unit.unlockAfter) return true
      return !!this.rows[unit.unlockAfter]?.completed
    },
    /** 活动内可见单元（recap 活动隐藏小游戏入口） */
    visibleUnits(activity: ActivityEntry, units: ManifestUnit[]): ManifestUnit[] {
      if (activity.meta.status === 'recap') return units.filter(u => u.type !== 'minigame')
      return units
    },
  },
})
