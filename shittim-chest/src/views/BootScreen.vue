<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { useProgressStore } from '../store/progressStore'
import { GameDatabase } from '../core/db/Database'
import { manifestResolver } from '../core/manifest/ManifestResolver'
import { assetLoader } from '../core/assets/AssetLoader'
import { audioManager } from '../core/audio/AudioManager'

const app = useAppStore()
const settings = useSettingsStore()
const progress = useProgressStore()

const percent = ref(0)
const stepText = ref('正在唤醒 SHITTIM CHEST …')
const tips = [
  '小贴士：本平台所有内容均来自本地内容包，完全离线可用。',
  '小贴士：活动「先将她们的小夜曲」已在列表中等待老师。',
  '小贴士：桃信里藏着通往后话（羁绊剧情）的入口。',
  '小贴士：小游戏里在节拍标记进入高亮区时按下，可打出 PERFECT！',
  '小贴士：处于 recap 状态的补档活动，不会显示小游戏入口。',
]
const tip = ref(tips[Math.floor(Math.random() * tips.length)])

onMounted(async () => {
  const setStep = async (text: string, p: number, job: () => Promise<void>) => {
    stepText.value = text
    percent.value = p
    await job()
  }

  await setStep('初始化本地数据库（SQLite）…', 8, async () => {
    const db = await GameDatabase.create()
    await settings.init(db)
    await progress.init(db)
  })

  await setStep('读取内容清单 manifest.json …', 20, async () => {
    await manifestResolver.load()
    audioManager.setFiles(manifestResolver.manifest.audio)
  })

  await setStep('初始化 PixiJS 资产系统 …', 30, async () => {
    await assetLoader.init(manifestResolver.manifest)
  })

  const bundleNames = [...new Set(manifestResolver.manifest.pixi.bundles.map(b => b.name))]
  stepText.value = '预载本地内容包 …'
  await assetLoader.loadBundles(bundleNames, (p) => {
    percent.value = 30 + Math.round(p * 62)
  })

  stepText.value = '校验内容包完整性 …'
  percent.value = 97
  for (const a of manifestResolver.activities) {
    for (const u of a.units) {
      if (u.script) {
        const res = await fetch('./content/' + u.script)
        if (!res.ok) console.warn(`[boot] 脚本缺失: ${u.script}`)
      }
    }
  }

  percent.value = 100
  stepText.value = '欢迎回来，老师。'
  setTimeout(() => app.goto('menu', {}, true), 650)
})
</script>

<template>
  <div class="boot">
    <img class="boot-logo" src="/content/packs/serenade-promenade/assets/ui/logo_shittim.svg" alt="SHITTIM CHEST" />
    <div class="boot-step">{{ stepText }}</div>
    <div class="boot-bar">
      <div class="boot-bar-fill" :style="{ width: percent + '%' }"></div>
    </div>
    <div class="boot-meta">
      <span class="pct">{{ percent }}%</span>
      <span class="tip">{{ tip }}</span>
    </div>
    <div class="boot-foot">NOW LOADING · OFFLINE MODE</div>
  </div>
</template>

<style scoped>
.boot {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(1100px 500px at 78% 18%, rgba(79, 195, 255, .12), transparent 60%),
    radial-gradient(900px 500px at 12% 88%, rgba(167, 139, 250, .10), transparent 60%),
    #0b1526;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 0 10%;
}
.boot-logo { width: min(520px, 60%); filter: drop-shadow(0 6px 30px rgba(79,195,255,.25)); }
.boot-step { font-size: 14px; color: var(--text-dim); letter-spacing: .12em; }
.boot-bar {
  width: 100%;
  height: 14px;
  border-radius: 999px;
  background: rgba(255,255,255,.08);
  border: 1px solid var(--line);
  overflow: hidden;
}
.boot-bar-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #2f8fe0, #4fc3ff 60%, #a78bfa);
  box-shadow: 0 0 18px rgba(79,195,255,.55);
  transition: width .25s ease;
}
.boot-meta { width: 100%; display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); }
.pct { color: var(--accent); font-weight: 700; letter-spacing: .1em; }
.boot-foot { margin-top: 18px; font-size: 11px; letter-spacing: .4em; color: rgba(159, 182, 221, .55); }
</style>
