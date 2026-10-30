<script setup lang="ts">
/**
 * LobbyStage —— vue3-pixi 声明式渲染的记忆大厅舞台
 * V1 使用占位立绘 + 呼吸动画；接口预留见 core/story/LobbyModelAdapter.ts
 */
import { ref } from 'vue'
import { Assets, Texture } from 'pixi.js'
import { onTick } from 'vue3-pixi'
import { audioManager } from '../core/audio/AudioManager'
import { randomOf } from '../core/utils'

// 注：vue3-pixi 内嵌独立的 pixi.js 类型副本，texture prop 用 any 规避重复声明类型冲突（运行时为同一版本）
const bgTex = (Assets.get('bg_lobby_room') ?? Texture.WHITE) as any
const heartTex = (Assets.get('fx_heart') ?? Texture.WHITE) as any
const noteTex = (Assets.get('fx_note') ?? Texture.WHITE) as any

const texNormal = (Assets.get('char_mari_normal') ?? Texture.WHITE) as any
const texSmile = (Assets.get('char_mari_smile') ?? Texture.WHITE) as any
const charTex = ref<any>(texNormal)

const CHAR_X = 860
const CHAR_Y = 436
const CHAR_SCALE = 0.545
const bob = ref(0)
const charY = ref(CHAR_Y)
const tapPulse = ref(0)
const time = ref(0)

interface Particle { id: number; x: number; y: number; alpha: number; scale: number; rot: number; kind: 'heart' | 'note' }
const particles = ref<Particle[]>([])
let particleSeq = 0
let smileTimer: ReturnType<typeof setTimeout> | null = null
let busy = false

onTick((ticker) => {
  const d = ticker.deltaMS
  time.value += d / 1000
  bob.value = Math.sin(time.value * 2.1) * 6
  charY.value = CHAR_Y + bob.value * 0.5
  if (tapPulse.value > 0) tapPulse.value = Math.max(0, tapPulse.value - d / 700)
  for (const p of particles.value) {
    p.y -= 1.7 * (d / 16.7)
    p.alpha -= 0.012 * (d / 16.7)
    p.rot = Math.sin(time.value * 3 + p.id) * 0.35
  }
  particles.value = particles.value.filter(p => p.alpha > 0.02)
})

function burst(x: number, y: number, kind: 'heart' | 'note', n: number): void {
  for (let i = 0; i < n; i++) {
    const p: Particle = {
      id: particleSeq++,
      x: x + (Math.random() - 0.5) * 220,
      y: y + (Math.random() - 0.5) * 160,
      alpha: 1,
      scale: 0.7 + Math.random() * 0.9,
      rot: 0,
      kind,
    }
    particles.value.push(p)
  }
}

function touchCharacter(): void {
  if (busy) return
  busy = true
  tapPulse.value = 1
  audioManager.playSfx('sfx_confirm')
  charTex.value = texSmile
  burst(CHAR_X, CHAR_Y - 160, 'heart', 9)
  audioManager.playVoice(randomOf(['voice_mari_01', 'voice_mari_02']))
  if (smileTimer) clearTimeout(smileTimer)
  smileTimer = setTimeout(() => {
    charTex.value = texNormal
    busy = false
  }, 1400)
}

function touchStage(e: PointerEvent): void {
  const rect = (e.target as HTMLElement).getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 1280
  const y = ((e.clientY - rect.top) / rect.height) * 720
  audioManager.playSfx('sfx_click')
  burst(x, y, 'note', 3)
}

defineExpose({ touchCharacter })
</script>

<template>
  <container @pointertap="touchStage">
    <sprite :texture="bgTex" :scale="0.667" />
    <sprite
      :texture="charTex"
      :x="CHAR_X" :y="charY" :anchor="0.5"
      :scale="CHAR_SCALE * (1 + tapPulse * 0.02)"
      @pointertap.stop="touchCharacter"
    />
    <sprite
      v-for="p in particles" :key="p.id"
      :texture="p.kind === 'heart' ? heartTex : noteTex"
      :x="p.x" :y="p.y" :alpha="p.alpha" :scale="p.scale" :rotation="p.rot" :anchor="0.5"
    />
  </container>
</template>
