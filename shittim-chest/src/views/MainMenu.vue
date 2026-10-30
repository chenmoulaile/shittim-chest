<script setup lang="ts">
import { ref } from 'vue'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { manifestResolver } from '../core/manifest/ManifestResolver'

const app = useAppStore()
const settings = useSettingsStore()
const showSettings = ref(false)

const serenade = manifestResolver.activities[0]

function openActivities(): void {
  app.goto('activities', {})
}

function openLobby(): void {
  app.goto('lobby', { activityId: serenade.id })
}
</script>

<template>
  <div class="menu">
    <img class="menu-bg" :src="'./content/packs/serenade-promenade/assets/ui/bg_menu.svg'" alt="" />
    <div class="menu-head">
      <img class="logo" :src="'./content/packs/serenade-promenade/assets/ui/logo_shittim.svg'" alt="SHITTIM CHEST" />
      <div class="ver">V1 · 先将她们的小夜曲 <span class="badge active">离线复刻</span></div>
    </div>

    <div class="menu-body">
      <div class="menu-card" @click="openActivities">
        <div class="mc-title">活动列表</div>
        <div class="mc-sub">剧情 · 桃信 · 小游戏</div>
      </div>
      <div class="menu-card" @click="openLobby">
        <div class="mc-title">记忆大厅</div>
        <div class="mc-sub">动态立绘观赏</div>
      </div>
      <div class="menu-card" @click="showSettings = !showSettings">
        <div class="mc-title">设置</div>
        <div class="mc-sub">音频 / 文本速度</div>
      </div>

      <transition name="fade">
        <div v-if="showSettings" class="settings panel">
          <label class="row">
            <span>背景音乐</span>
            <button class="btn ghost small" @click.stop="settings.setBgm(!settings.bgmOn)">
              {{ settings.bgmOn ? 'ON' : 'OFF' }}
            </button>
          </label>
          <label class="row">
            <span>语音</span>
            <button class="btn ghost small" @click.stop="settings.setVoice(!settings.voiceOn)">
              {{ settings.voiceOn ? 'ON' : 'OFF' }}
            </button>
          </label>
          <label class="row">
            <span>文本速度 {{ settings.textSpeed }}ms/字</span>
            <input type="range" min="8" max="70" :value="settings.textSpeed"
              @input.stop="settings.setTextSpeed(Number(($event.target as HTMLInputElement).value))" />
          </label>
        </div>
      </transition>
    </div>

    <div class="menu-foot">
      <span>FAN-MADE · 仅用于学习与技术验证 · 不含任何官方资源</span>
    </div>
  </div>
</template>

<style scoped>
.menu { position: absolute; inset: 0; }
.menu-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: cover; /* 相对路径 <img>：兼容任意子路径部署与 Electron file:// */
}
.menu-head { position: absolute; top: 7%; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.logo { width: min(460px, 52%); filter: drop-shadow(0 8px 30px rgba(79,195,255,.3)); }
.ver { font-size: 13px; color: var(--text-dim); letter-spacing: .18em; display: flex; gap: 10px; align-items: center; }
.menu-body {
  position: absolute; left: 50%; top: 54%;
  transform: translateX(-50%);
  display: flex; gap: 20px; align-items: flex-start;
}
.menu-card {
  width: 172px;
  padding: 20px 18px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(18, 32, 58, .92), rgba(12, 22, 42, .88));
  cursor: pointer;
  transition: all .18s ease;
  text-align: left;
}
.menu-card:hover { transform: translateY(-4px); border-color: var(--accent); box-shadow: 0 10px 30px rgba(47, 143, 224, .25); }
.mc-title { font-size: 18px; font-weight: 700; letter-spacing: .08em; }
.mc-sub { margin-top: 6px; font-size: 12px; color: var(--text-dim); }
.settings { position: absolute; top: 0; right: -230px; width: 212px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.settings .row { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 13px; color: var(--text-dim); }
.settings input[type="range"] { width: 84px; accent-color: var(--accent); }
.btn.small { padding: 4px 12px; font-size: 12px; }
.menu-foot {
  position: absolute; bottom: 18px; left: 0; right: 0;
  text-align: center; font-size: 11px; letter-spacing: .2em; color: rgba(159,182,221,.5);
}
</style>
