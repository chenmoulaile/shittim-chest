<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAppStore } from '../store/appStore'
import { useSettingsStore } from '../store/settingsStore'
import { useProgressStore } from '../store/progressStore'
import { manifestResolver } from '../core/manifest/ManifestResolver'
import { RenderManager } from '../core/story/RenderManager'
import { StoryController } from '../core/story/Controller'
import { audioManager } from '../core/audio/AudioManager'
import type { CharacterTable } from '../core/manifest/types'

const app = useAppStore()
const settings = useSettingsStore()
const progress = useProgressStore()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const chapterTitle = ref('')
const say = ref({ name: '', color: '#9fb6dd', text: '', narration: false })
const shown = ref(0)
const typing = ref(false)
const ended = ref(false)
const autoOn = ref(false)

const choice = ref<{ visible: boolean; prompt: string; options: { text: string; index: number }[] }>({
  visible: false, prompt: '', options: [],
})
const titleOv = ref<{ visible: boolean; text: string; sub: string }>({ visible: false, text: '', sub: '' })

let render: RenderManager | null = null
let controller: StoryController | null = null
let typeTimer: ReturnType<typeof setInterval> | null = null
let autoTimer: ReturnType<typeof setTimeout> | null = null
let titleResolve: (() => void) | null = null
let choiceResolve: ((i: number) => void) | null = null

function startTyping(): void {
  if (typeTimer) clearInterval(typeTimer)
  const full = say.value.text.length
  shown.value = 0
  typing.value = true
  typeTimer = setInterval(() => {
    shown.value += 1
    if (shown.value >= full) {
      shown.value = full
      typing.value = false
      if (typeTimer) clearInterval(typeTimer)
      typeTimer = null
    }
  }, Math.max(8, settings.textSpeed))
}

function stageClick(): void {
  if (ended.value) return
  audioManager.playSfx('sfx_click')
  if (titleOv.value.visible) {
    titleOv.value.visible = false
    titleResolve?.()
    titleResolve = null
    return
  }
  if (typing.value) {
    shown.value = say.value.text.length
    typing.value = false
    if (typeTimer) clearInterval(typeTimer)
    typeTimer = null
    return
  }
  if (choice.value.visible) return
  controller?.advance()
}

function pickChoice(i: number): void {
  audioManager.playSfx('sfx_confirm')
  choice.value.visible = false
  choiceResolve?.(i)
  choiceResolve = null
}

function skipChapter(): void {
  audioManager.playSfx('sfx_confirm')
  controller?.skipAll()
}

function leave(): void {
  controller?.stop()
  app.back()
}

onMounted(async () => {
  const { activityId, unitId } = app.params
  if (!activityId || !unitId) { app.back(); return }
  const activity = manifestResolver.activity(activityId)
  const unit = manifestResolver.unit(activityId, unitId)
  const characters: CharacterTable = await manifestResolver.loadCharacterTable(activity)
  const script = await manifestResolver.loadStory(unit)

  render = new RenderManager()
  if (canvasRef.value) await render.init(canvasRef.value)

  controller = new StoryController({
    render,
    audio: audioManager,
    characters,
    onFlag: (flag) => { void progress.recordChoice(unit.id, flag) },
    ui: {
      onSay(info) {
        say.value = { ...info }
        startTyping()
      },
      async onTitle(text, sub) {
        titleOv.value = { visible: true, text, sub: sub ?? '' }
        return new Promise<void>((resolve) => {
          titleResolve = resolve
          setTimeout(() => {
            if (titleOv.value.visible) {
              titleOv.value.visible = false
              resolve()
              titleResolve = null
            }
          }, 2600)
        })
      },
      async onChoice(prompt, options) {
        choice.value = { visible: true, prompt: prompt ?? '', options }
        return new Promise<number>((resolve) => { choiceResolve = resolve })
      },
      onChapterTitle(t) { chapterTitle.value = t },
      onProgress() { /* 进度显示可按需扩展 */ },
      onEnded() {
        ended.value = true
        void progress.markComplete(unit.id)
        app.showToast('本章完成 ✓ 进度已保存')
        setTimeout(() => { if (app.view === 'story') app.back() }, 1100)
      },
    },
  })

  await controller.play(script)
})

onBeforeUnmount(() => {
  controller?.stop()
  if (typeTimer) clearInterval(typeTimer)
  if (autoTimer) clearTimeout(autoTimer)
  render?.destroy()
  render = null
})

watch([typing, () => choice.value.visible, () => titleOv.value.visible, autoOn], () => {
  if (autoTimer) clearTimeout(autoTimer)
  if (!autoOn.value || ended.value) return
  if (typing.value || choice.value.visible || titleOv.value.visible) return
  autoTimer = setTimeout(() => controller?.advance(), 1350)
})
</script>

<template>
  <div class="story" @click="stageClick">
    <canvas ref="canvasRef" class="story-canvas"></canvas>

    <div class="topbar">
      <button class="btn ghost" @click.stop="leave">← 退出</button>
      <div class="title">{{ chapterTitle }}</div>
      <div class="spacer"></div>
      <button class="btn ghost" :class="{ on: autoOn }" @click.stop="autoOn = !autoOn">
        自动 {{ autoOn ? 'ON' : 'OFF' }}
      </button>
      <button class="btn ghost" @click.stop="skipChapter">跳过 ▶▶</button>
    </div>

    <!-- 章节标题卡 -->
    <transition name="fade">
      <div v-if="titleOv.visible" class="titlecard">
        <div class="tc-text">{{ titleOv.text }}</div>
        <div class="tc-sub">{{ titleOv.sub }}</div>
      </div>
    </transition>

    <!-- 选项 -->
    <transition name="fade">
      <div v-if="choice.visible" class="choices" @click.stop>
        <div class="ch-prompt">{{ choice.prompt }}</div>
        <button v-for="opt in choice.options" :key="opt.index" class="btn choice-btn" @click="pickChoice(opt.index)">
          {{ opt.text }}
        </button>
      </div>
    </transition>

    <!-- 对话框 -->
    <div class="dialog" @click.stop="stageClick">
      <div v-if="!say.narration && say.name" class="nameplate" :style="{ borderColor: say.color, color: say.color }">
        {{ say.name }}
      </div>
      <div class="dialog-text" :class="{ narration: say.narration }">
        {{ say.text.slice(0, shown) }}<span v-if="typing" class="caret">▌</span>
      </div>
      <div v-if="!typing && !choice.visible && !titleOv.visible && !ended" class="next-hint">▼</div>
    </div>
  </div>
</template>

<style scoped>
.story { position: absolute; inset: 0; cursor: pointer; }
.story-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
.topbar .spacer { flex: 1; }
.topbar .btn.on { border-color: var(--accent); color: var(--accent); }

.titlecard {
  position: absolute; inset: 0;
  background: rgba(2, 5, 12, .96);
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px;
  z-index: 30;
}
.tc-text { font-size: 58px; font-weight: 800; letter-spacing: .3em; color: #fff; }
.tc-sub { font-size: 20px; letter-spacing: .2em; color: var(--text-dim); }

.choices {
  position: absolute; left: 50%; bottom: 240px;
  transform: translateX(-50%);
  display: flex; flex-direction: column; gap: 12px; align-items: center;
  z-index: 25; width: min(560px, 80%);
}
.ch-prompt { font-size: 14px; color: var(--text-dim); letter-spacing: .1em; }
.choice-btn { width: 100%; background: rgba(12, 24, 46, .92); font-size: 16px; padding: 14px; }

.dialog {
  position: absolute; left: 26px; right: 26px; bottom: 22px;
  min-height: 118px;
  background: rgba(8, 15, 30, .88);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px 26px 24px;
  cursor: pointer;
}
.nameplate {
  position: absolute; top: -16px; left: 22px;
  background: rgba(8, 15, 30, .96);
  border: 2px solid;
  border-radius: 8px;
  padding: 4px 16px;
  font-size: 15px; font-weight: 700; letter-spacing: .1em;
}
.dialog-text {
  font-size: 17.5px; line-height: 1.85; letter-spacing: .04em;
  min-height: 66px; white-space: pre-wrap;
}
.dialog-text.narration { color: var(--text-dim); }
.caret { color: var(--accent); animation: blink 0.9s infinite; }
.next-hint {
  position: absolute; right: 18px; bottom: 10px;
  color: var(--accent); font-size: 13px;
  animation: floaty 1.1s infinite;
}
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
</style>
