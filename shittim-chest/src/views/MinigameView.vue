<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Application, Assets, Texture } from 'pixi.js'
import { useAppStore } from '../store/appStore'
import { useProgressStore } from '../store/progressStore'
import { manifestResolver } from '../core/manifest/ManifestResolver'
import { assetLoader } from '../core/assets/AssetLoader'
import { audioManager } from '../core/audio/AudioManager'
import { createMinigame, type MinigameModule, type MinigameSnapshot } from '../core/minigame'

const app = useAppStore()
const progress = useProgressStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const snapshot = ref<MinigameSnapshot | null>(null)
const paused = ref(false)
const saved = ref(false)

let pixiApp: Application | null = null
let game: MinigameModule | null = null

const gameTitle = computed(() => snapshot.value?.gameTitle ?? '小游戏')
const canAct = computed(() => snapshot.value?.phase === 'select')
const inTiming = computed(() => snapshot.value?.phase === 'timing')

const timingPct = computed(() => {
  const s = snapshot.value
  if (!s || s.phase !== 'timing') return 0
  return Math.min(100, Math.max(0, s.timingT * 100))
})

function onKey(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault()
    if (inTiming.value) game?.command('timing')
  }
}

function send(cmd: string): void {
  if (!game || paused.value) return
  audioManager.playSfx('sfx_click')
  game.command(cmd)
}

function togglePause(): void {
  if (!game) return
  paused.value = !paused.value
  if (paused.value) game.pause()
  else game.resume()
}

function leave(): void {
  app.back()
}

onMounted(async () => {
  const { activityId, unitId } = app.params
  if (!activityId || !unitId) { app.back(); return }
  const activity = manifestResolver.activity(activityId)
  const unit = manifestResolver.unit(activityId, unitId)
  if (!unit.minigameType) { app.showToast('小游戏类型缺失'); app.back(); return }

  // 按需确保活动资源包已加载（通常在 Boot 阶段已全部预载）
  await assetLoader.ensureBundles(activity.assets.bundles)

  game = createMinigame(unit.minigameType)
  if (!game) { app.showToast('该小游戏类型尚未实现'); app.back(); return }

  const config = await manifestResolver.loadMinigameConfig(unit)
  pixiApp = new Application()
  if (canvasRef.value) {
    await pixiApp.init({
      canvas: canvasRef.value,
      width: 1280,
      height: 720,
      background: '#0b1526',
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    })
  }

  await game.init({
    app: pixiApp,
    config,
    texture: (alias: string) => (Assets.get(alias) ?? Texture.WHITE) as Texture,
    audio: audioManager,
    onState: (s) => {
      snapshot.value = s
      if (s.phase === 'result' && !saved.value) {
        saved.value = true
        void progress.markComplete(unitId, s.score)
        void progress.recordScore(unitId, s.score)
      }
    },
  })
  game.start()
  window.addEventListener('keydown', onKey)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  game?.destroy()
  pixiApp?.destroy(true, { children: true, texture: false })
  game = null
  pixiApp = null
})
</script>

<template>
  <div class="mg" @click="inTiming && game?.command('timing')">
    <canvas ref="canvasRef" class="mg-canvas"></canvas>

    <div class="topbar">
      <button class="btn ghost" @click.stop="leave">← 退出</button>
      <div class="title">{{ gameTitle }} · {{ snapshot?.levelTitle }}</div>
      <div class="spacer"></div>
      <button class="btn ghost" @click.stop="togglePause">{{ paused ? '继续' : '暂停' }}</button>
    </div>

    <template v-if="snapshot">
      <!-- 敌方面板 -->
      <div class="enemy-panel panel" v-if="snapshot.enemyName">
        <div class="ep-head">
          <span class="ep-name">{{ snapshot.enemyName }}</span>
          <span v-if="snapshot.enemyIsBoss" class="badge recap">BOSS</span>
          <span class="ep-wave">{{ snapshot.waveIndex + 1 }}/{{ snapshot.waveTotal }}</span>
        </div>
        <div class="hpbar ep">
          <i :style="{ transform: `scaleX(${snapshot.enemyHp / snapshot.enemyMaxHp})`, background: 'linear-gradient(90deg,#ff6e82,#c04858)' }"></i>
        </div>
        <div class="ep-telegraph">即将受到 ≈{{ snapshot.incoming }} 伤害</div>
      </div>

      <!-- 我方面板 -->
      <div class="player-panel panel">
        <div class="pp-head">
          <span class="pp-name">伊落玛丽（偶像）</span>
          <span class="pp-combo" v-if="snapshot.combo > 1">{{ snapshot.combo }} 连击!</span>
        </div>
        <div class="hpbar pp">
          <i :style="{ transform: `scaleX(${snapshot.playerHp / snapshot.playerMaxHp})`, background: 'linear-gradient(90deg,#2f8fe0,#4fc3ff)' }"></i>
        </div>
        <div class="pp-row">
          <span>HP {{ snapshot.playerHp }}/{{ snapshot.playerMaxHp }}</span>
          <span v-if="snapshot.shield > 0" class="shield-chip">✦ 护盾 {{ snapshot.shield }}</span>
        </div>
        <div class="ultbar">
          <i :style="{ width: snapshot.ult + '%' }"></i>
          <span class="ult-label">{{ snapshot.ult >= 100 ? '终乐章 READY' : `充能 ${snapshot.ult}/100` }}</span>
        </div>
        <div class="supports">
          <span class="support" title="每回合恢复少量生命">♪ 樱子·和声治愈</span>
          <span class="support" title="每3回合获得护盾">✦ 美祢·应援护盾</span>
        </div>
      </div>

      <!-- 战斗日志 -->
      <div class="log panel">
        <div v-for="(line, i) in snapshot.log.slice(-3)" :key="i" class="log-line">{{ line }}</div>
      </div>

      <!-- 指令区 -->
      <div v-if="canAct || inTiming" class="commands">
        <template v-if="canAct">
          <button class="btn primary" @click.stop="send('attack')">♪ 演唱·强音</button>
          <button class="btn" @click.stop="send('heal')">♫ 和声·治愈</button>
          <button class="btn ult" :disabled="snapshot.ult < 100" @click.stop="send('ult')">☆ 终乐章</button>
        </template>
        <template v-else>
          <div class="timing">
            <div class="timing-track">
              <div class="tz good"></div>
              <div class="tz perfect"></div>
              <div class="timing-marker" :style="{ left: timingPct + '%' }"></div>
            </div>
            <button class="btn primary beat-btn" @click.stop="game?.command('timing')">节拍！（空格）</button>
          </div>
        </template>
      </div>

      <!-- 结果 / 败北 -->
      <div v-if="snapshot.phase === 'result'" class="result panel">
        <div class="r-title">演出成功！</div>
        <div class="r-rank" :class="'rank-' + snapshot.rank">{{ snapshot.rank }}</div>
        <div class="r-rows">
          <div><span>得分</span><b>{{ snapshot.score }}</b></div>
          <div><span>PERFECT</span><b>{{ snapshot.perfects }}</b></div>
          <div><span>回合数</span><b>{{ snapshot.turns }}</b></div>
        </div>
        <div class="r-actions">
          <button v-if="snapshot.hasNextLevel" class="btn primary" @click.stop="send('next-level')">下一乐章 →</button>
          <button class="btn" @click.stop="send('retry')">重新挑战</button>
          <button class="btn ghost" @click.stop="leave">返回活动</button>
        </div>
      </div>
      <div v-else-if="snapshot.phase === 'defeat'" class="result panel lose">
        <div class="r-title">舞台被噪音淹没了……</div>
        <div class="r-rows"><div><span>存活回合</span><b>{{ snapshot.turns }}</b></div></div>
        <div class="r-actions">
          <button class="btn primary" @click.stop="send('retry')">再来一次</button>
          <button class="btn ghost" @click.stop="leave">返回活动</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.mg { position: absolute; inset: 0; }
.mg-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.topbar .spacer { flex: 1; }

.enemy-panel { position: absolute; top: 64px; right: 26px; width: 330px; padding: 12px 16px; }
.ep-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ep-name { font-size: 15px; font-weight: 700; flex: 1; }
.ep-wave { font-size: 12px; color: var(--text-dim); }
.ep-telegraph { margin-top: 8px; font-size: 12px; color: var(--danger); letter-spacing: .06em; }

.player-panel { position: absolute; left: 26px; bottom: 96px; width: 330px; padding: 12px 16px; }
.pp-head { display: flex; align-items: center; gap: 10px; }
.pp-name { font-size: 15px; font-weight: 700; flex: 1; }
.pp-combo { color: var(--gold); font-size: 13px; font-weight: 800; }
.pp-row { display: flex; justify-content: space-between; font-size: 12px; color: var(--text-dim); margin-top: 8px; }
.shield-chip { color: #8fd0ff; }
.ultbar {
  position: relative; margin-top: 8px; height: 14px; border-radius: 999px;
  background: rgba(255,255,255,.1); overflow: hidden;
}
.ultbar i { display: block; height: 100%; background: linear-gradient(90deg, #a78bfa, #ffd257); transition: width .3s ease; }
.ult-label { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #fff; letter-spacing: .1em; }
.supports { display: flex; gap: 8px; margin-top: 10px; }
.support { font-size: 11px; color: var(--text-dim); border: 1px solid var(--line); padding: 3px 9px; border-radius: 999px; }

.log { position: absolute; right: 26px; bottom: 96px; width: 330px; padding: 10px 14px; }
.log-line { font-size: 12.5px; color: var(--text-dim); line-height: 1.8; }
.log-line:last-child { color: var(--text); }

.commands { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; gap: 14px; }
.commands .btn { min-width: 168px; font-size: 15.5px; }
.commands .btn.ult { background: linear-gradient(180deg, rgba(167,139,250,.5), rgba(167,139,250,.15)); border-color: rgba(167,139,250,.6); }

.timing { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.timing-track {
  position: relative; width: 560px; height: 26px;
  border-radius: 999px; background: rgba(255,255,255,.1);
  border: 1px solid var(--line); overflow: hidden;
}
.tz { position: absolute; top: 0; bottom: 0; left: 50%; transform: translateX(-50%); }
.tz.good { width: 26%; background: rgba(79,195,255,.25); }
.tz.perfect { width: 11%; background: rgba(255,210,87,.55); }
.timing-marker {
  position: absolute; top: -2px; bottom: -2px; width: 6px; border-radius: 4px;
  background: #fff; box-shadow: 0 0 12px rgba(255,255,255,.9);
}
.beat-btn { min-width: 280px; }

.result {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 380px; padding: 26px 28px; text-align: center; z-index: 30;
}
.r-title { font-size: 19px; font-weight: 800; letter-spacing: .1em; }
.r-rank { font-size: 64px; font-weight: 900; margin: 8px 0; color: var(--gold); text-shadow: 0 0 24px rgba(255,210,87,.5); }
.r-rank.rank-A { color: #4fc3ff; }
.r-rank.rank-B { color: #8fe0a8; }
.r-rank.rank-C { color: #9fb6dd; }
.r-rows { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }
.r-rows div { display: flex; justify-content: space-between; font-size: 14px; color: var(--text-dim); }
.r-rows b { color: var(--text); }
.r-actions { display: flex; gap: 10px; justify-content: center; }
.lose { border-color: rgba(255,143,160,.5); }
</style>
