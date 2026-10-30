<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useAppStore } from '../store/appStore'
import { useProgressStore } from '../store/progressStore'
import { manifestResolver } from '../core/manifest/ManifestResolver'
import { audioManager } from '../core/audio/AudioManager'
import type { MomotalkMessage, MomotalkScript, MomotalkThread } from '../core/manifest/types'

const app = useAppStore()
const progress = useProgressStore()

const script = ref<MomotalkScript | null>(null)
const activeThreadId = ref('')
const cursor = ref(0)                 // 已展示到的消息下标（含）
const pendingMerge = ref('')          // 分支汇合点：跳转后线性播放直到遇到该 id
const typingStudent = ref(false)      // “对方正在输入”
const pickedHistory = ref<Record<string, string>>({}) // msgId -> 选项文本（保留选择历史）
const chatEl = ref<HTMLDivElement | null>(null)

const activeThread = computed<MomotalkThread | null>(() =>
  script.value?.threads.find(t => t.studentId === activeThreadId.value) ?? null)

const visibleMessages = computed(() =>
  activeThread.value ? activeThread.value.messages.slice(0, cursor.value) : [])

const currentMessage = computed(() =>
  activeThread.value?.messages[cursor.value] ?? null)

onMounted(async () => {
  const { activityId, unitId } = app.params
  if (!activityId || !unitId) { app.back(); return }
  const unit = manifestResolver.unit(activityId, unitId)
  script.value = await manifestResolver.loadMomotalk(unit)
  activeThreadId.value = app.params.threadId ?? script.value.threads[0].studentId
  cursor.value = 0
  void step()
})

/** 逐条推进消息流：学生消息前显示“正在输入”；分支跳转后播放到汇合点 */
async function step(): Promise<void> {
  const thread = activeThread.value
  if (!thread) return
  while (cursor.value < thread.messages.length) {
    const msg = thread.messages[cursor.value]
    if (pendingMerge.value) {
      if (msg.id === pendingMerge.value) pendingMerge.value = ''
      else { cursor.value += 1; continue } // 跳过其它分支的消息
    }
    if (msg.type === 'msg' && msg.from === 'student') {
      typingStudent.value = true
      await delay(620)
      typingStudent.value = false
    }
    cursor.value += 1
    audioManager.playSfx('sfx_click')
    await nextTick()
    scrollBottom()
    if (msg.type === 'msg' && msg.voice) audioManager.playVoice(msg.voice)
    if (msg.type === 'options') return // 等待玩家选择
    await delay(420)
  }
}

function delay(ms: number): Promise<void> { return new Promise(r => setTimeout(r, ms)) }

function scrollBottom(): void {
  const el = chatEl.value
  if (el) el.scrollTop = el.scrollHeight
}

function pickOption(msgId: string, optIndex: number): void {
  const thread = activeThread.value
  const msg = thread?.messages.find(m => m.id === msgId)
  if (!thread || !msg?.options) return
  const opt = msg.options[optIndex]
  pickedHistory.value[msgId] = opt.text
  void progress.recordChoice(`momotalk-${thread.studentId}`, `${msgId}:${optIndex}`)
  audioManager.playSfx('sfx_confirm')
  const targetIdx = thread.messages.findIndex(m => m.id === opt.goto)
  if (targetIdx >= 0) {
    pendingMerge.value = msg.merge ?? ''
    cursor.value = targetIdx
    void step()
  }
}

function continueChat(): void {
  if (typingStudent.value) return
  if (currentMessage.value?.type === 'options') return
  void step()
}

function openBondMsg(msg: MomotalkMessage): void {
  const { activityId } = app.params
  const bondId = msg.storyUnitId
  if (!activityId || !bondId) return
  const unit = manifestResolver.unit(activityId, bondId)
  if (!progress.isUnlocked(unit)) {
    app.showToast('完成第4话后即可阅读后话')
    return
  }
  app.goto('story', { activityId, unitId: bondId })
}

function switchThread(id: string): void {
  if (id === activeThreadId.value) return
  audioManager.playSfx('sfx_click')
  activeThreadId.value = id
  cursor.value = 0
  typingStudent.value = false
  void step()
}

function srcOf(alias: string): string {
  try { return manifestResolver.srcOf(alias) } catch { return '' }
}
</script>

<template>
  <div class="momo">
    <div class="topbar">
      <button class="btn ghost" @click="app.back()">← 返回</button>
      <div class="title">桃信 · MomoTalk</div>
    </div>

    <div v-if="script" class="layout">
      <!-- 学生列表 -->
      <div class="threads panel">
        <div class="threads-head">通话对象</div>
        <div v-for="t in script.threads" :key="t.studentId" class="thread" :class="{ on: t.studentId === activeThreadId }"
          @click="switchThread(t.studentId)">
          <img v-if="srcOf(t.avatar)" :src="srcOf(t.avatar)" class="avatar" />
          <div class="t-info">
            <div class="t-name">{{ t.title }}</div>
            <div class="t-last">{{ t.messages[0]?.text?.slice(0, 14) }}…</div>
          </div>
        </div>
      </div>

      <!-- 聊天窗口 -->
      <div class="chat panel">
        <div ref="chatEl" class="chat-scroll" @click="continueChat">
          <div v-for="msg in visibleMessages" :key="msg.id" class="msg-row" :class="msg.from === 'player' ? 'right' : 'left'">
            <template v-if="msg.type === 'msg'">
              <img v-if="msg.from === 'student' && activeThread && srcOf(activeThread.avatar)"
                class="bubble-avatar" :src="srcOf(activeThread.avatar)" />
              <div class="bubble" :class="msg.from === 'player' ? 'mine' : 'theirs'">
                <div v-if="msg.text">{{ msg.text }}</div>
                <img v-if="msg.image" class="bubble-img" :src="srcOf(msg.image)" />
              </div>
            </template>
            <template v-else-if="msg.type === 'options'">
              <div class="opt-wrap">
                <div v-if="!pickedHistory[msg.id]" class="opt-list">
                  <button v-for="(opt, i) in msg.options" :key="i" class="btn choice-btn"
                    @click.stop="pickOption(msg.id, i)">{{ opt.text }}</button>
                </div>
                <div v-else class="opt-recall">
                  <span class="badge done">已选择</span> {{ pickedHistory[msg.id] }}
                </div>
              </div>
            </template>
            <template v-else-if="msg.type === 'bond'">
              <button class="bond-card" @click.stop="openBondMsg(msg)">
                <span class="bond-heart">♡</span> {{ msg.text }}
              </button>
            </template>
          </div>

          <div v-if="typingStudent" class="msg-row left">
            <div class="bubble theirs typing"><i></i><i></i><i></i></div>
          </div>
        </div>

        <div class="chat-foot">
          <template v-if="currentMessage && currentMessage.type === 'options'">请选择回复…</template>
          <template v-else-if="cursor >= (activeThread?.messages.length ?? 0)">—— 通话记录结束 ——</template>
          <template v-else>点击聊天区继续</template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.momo {
  position: absolute; inset: 0;
  background:
    radial-gradient(900px 420px at 20% 0%, rgba(255, 176, 200, .07), transparent 60%),
    #0b1526;
}
.layout {
  position: absolute; inset: 64px 26px 22px;
  display: grid; grid-template-columns: 300px 1fr; gap: 20px;
}
.threads { padding: 12px; overflow: auto; }
.threads-head { font-size: 12px; letter-spacing: .3em; color: var(--text-dim); padding: 6px 8px 10px; }
.thread {
  display: flex; align-items: center; gap: 12px;
  padding: 10px; border-radius: 12px; cursor: pointer;
  border: 1px solid transparent;
  transition: all .15s ease;
}
.thread:hover { background: rgba(79,195,255,.08); }
.thread.on { background: rgba(79,195,255,.12); border-color: var(--line); }
.avatar { width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--line); }
.t-name { font-size: 15px; font-weight: 700; }
.t-last { font-size: 12px; color: var(--text-dim); margin-top: 3px; }
.chat { display: flex; flex-direction: column; overflow: hidden; }
.chat-scroll { flex: 1; overflow: auto; padding: 20px 24px; cursor: pointer; }
.msg-row { display: flex; margin-bottom: 14px; align-items: flex-end; gap: 10px; }
.msg-row.right { justify-content: flex-end; }
.bubble-avatar { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--line); }
.bubble {
  max-width: 62%;
  padding: 11px 16px;
  border-radius: 14px;
  font-size: 14.5px; line-height: 1.7;
}
.bubble.theirs { background: rgba(255, 255, 255, .93); color: #23324e; border-top-left-radius: 4px; }
.bubble.mine { background: linear-gradient(180deg, #3f96e8, #2f7fd0); color: #fff; border-top-right-radius: 4px; }
.bubble-img { margin-top: 8px; width: 100%; max-height: 220px; object-fit: cover; border-radius: 10px; display: block; }
.bubble.typing { display: flex; gap: 5px; padding: 14px 18px; }
.bubble.typing i {
  width: 7px; height: 7px; border-radius: 50%; background: #7f93b8;
  animation: bounce 1s infinite;
}
.bubble.typing i:nth-child(2) { animation-delay: .15s; }
.bubble.typing i:nth-child(3) { animation-delay: .3s; }
@keyframes bounce { 0%, 100% { transform: translateY(0); opacity: .5; } 50% { transform: translateY(-5px); opacity: 1; } }
.opt-wrap { width: 100%; display: flex; justify-content: center; }
.opt-list { display: flex; flex-direction: column; gap: 10px; width: min(430px, 88%); }
.choice-btn { background: rgba(12, 24, 46, .92); }
.opt-recall { font-size: 13px; color: var(--text-dim); display: flex; gap: 8px; align-items: center; }
.bond-card {
  width: min(430px, 88%);
  margin: 4px auto;
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid rgba(255, 176, 200, .55);
  background: linear-gradient(90deg, rgba(255, 176, 200, .16), rgba(167, 139, 250, .16));
  color: var(--text);
  font-size: 14.5px;
  cursor: pointer;
  transition: all .16s ease;
}
.bond-card:hover { box-shadow: 0 0 20px rgba(255, 176, 200, .3); transform: translateY(-2px); }
.bond-heart { color: #ff8fb0; font-size: 17px; }
.chat-foot {
  padding: 12px 18px; font-size: 12.5px; color: var(--text-dim);
  border-top: 1px solid var(--line); text-align: center; letter-spacing: .14em;
}
</style>
