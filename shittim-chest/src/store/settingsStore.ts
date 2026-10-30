import { defineStore } from 'pinia'
import type { GameDatabase } from '../core/db/Database'
import { audioManager } from '../core/audio/AudioManager'

/** 用户设置（BGM / 语音 / 打字机速度），经 SQLite 持久化 */
export const useSettingsStore = defineStore('settings', {
  state: () => ({
    bgmOn: true,
    voiceOn: true,
    textSpeed: 34, // ms / 字符
    loaded: false,
    db: null as GameDatabase | null,
  }),
  actions: {
    async init(db: GameDatabase) {
      this.db = db
      const bgm = await db.getSetting('bgmOn')
      const voice = await db.getSetting('voiceOn')
      const speed = await db.getSetting('textSpeed')
      if (bgm != null) this.bgmOn = bgm === '1'
      if (voice != null) this.voiceOn = voice === '1'
      if (speed != null) this.textSpeed = Number(speed) || 34
      audioManager.setBgmEnabled(this.bgmOn)
      audioManager.setVoiceEnabled(this.voiceOn)
      this.loaded = true
    },
    async setBgm(on: boolean) {
      this.bgmOn = on
      audioManager.setBgmEnabled(on)
      await this.db?.setSetting('bgmOn', on ? '1' : '0')
    },
    async setVoice(on: boolean) {
      this.voiceOn = on
      audioManager.setVoiceEnabled(on)
      await this.db?.setSetting('voiceOn', on ? '1' : '0')
    },
    async setTextSpeed(v: number) {
      this.textSpeed = v
      await this.db?.setSetting('textSpeed', String(v))
    },
  },
})
