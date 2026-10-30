<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { Application } from 'vue3-pixi'
import LobbyStage from '../components/LobbyStage.vue'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { audioManager } from '../core/audio/AudioManager'
import { manifestResolver } from '../core/manifest/ManifestResolver'

const app = useAppStore()
const settings = useSettingsStore()
const lobbyRef = ref<InstanceType<typeof LobbyStage> | null>(null)

let activityTitle = '记忆大厅'
onMounted(() => {
  const { activityId } = app.params
  if (activityId) {
    try { activityTitle = `记忆大厅 · ${manifestResolver.activity(activityId).meta.title}` } catch { /* 默认 */ }
  }
  audioManager.playBgm('bgm_lobby')
})

onBeforeUnmount(() => {
  audioManager.stopBgm()
})
</script>

<template>
  <div class="lobby">
    <Application :width="1280" :height="720" background="#0b1526" :antialias="true">
      <LobbyStage ref="lobbyRef" />
    </Application>

    <div class="topbar">
      <button class="btn ghost" @click="app.back()">← 返回</button>
      <div class="title">{{ activityTitle }}</div>
    </div>

    <div class="controls">
      <button class="btn primary" @click="lobbyRef?.touchCharacter()">摸摸头</button>
      <button class="btn ghost" @click="settings.setBgm(!settings.bgmOn)">
        BGM {{ settings.bgmOn ? 'ON' : 'OFF' }}
      </button>
      <button class="btn ghost" @click="settings.setVoice(!settings.voiceOn)">
        语音 {{ settings.voiceOn ? 'ON' : 'OFF' }}
      </button>
    </div>

    <div class="hint">点击立绘或舞台任意位置产生触摸反馈 · V1 占位立绘（Spine / Live2D 适配接口已预留）</div>
  </div>
</template>

<style scoped>
.lobby { position: absolute; inset: 0; }
.controls {
  position: absolute; right: 26px; bottom: 24px;
  display: flex; gap: 12px; z-index: 20;
}
.hint {
  position: absolute; left: 26px; bottom: 24px;
  font-size: 12px; color: var(--text-dim); letter-spacing: .1em;
  z-index: 20;
  background: rgba(8, 15, 30, .6);
  padding: 8px 14px; border-radius: 10px;
  border: 1px solid var(--line);
}
</style>
