<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '../store/appStore'
import { useProgressStore } from '../store/progressStore'
import { manifestResolver } from '../core/manifest/ManifestResolver'
import { registeredTypes } from '../core/minigame'
import type { ActivityEntry, ManifestUnit } from '../core/manifest/types'

const app = useAppStore()
const progress = useProgressStore()

const activities = manifestResolver.activities
const currentId = ref(app.params.activityId ?? activities[0]?.id ?? '')
const current = computed<ActivityEntry | undefined>(() =>
  activities.find(a => a.id === currentId.value))

const grouped = computed(() => {
  const a = current.value
  if (!a) return null
  const visible = a.units.filter(u => manifestResolver.isUnitVisible(u, a))
  return {
    stories: visible.filter(u => u.type === 'story').sort((x, y) => x.order - y.order),
    bonds: visible.filter(u => u.type === 'bond'),
    momotalk: visible.filter(u => u.type === 'momotalk'),
    minigames: visible.filter(u => u.type === 'minigame'),
  }
})

const typeLabel: Record<string, string> = {
  story: '剧情', bond: '后话', momotalk: '桃信', minigame: '小游戏',
}

function unitState(u: ManifestUnit): 'done' | 'lock' | 'open' {
  if (progress.isCompleted(u.id)) return 'done'
  if (!progress.isUnlocked(u)) return 'lock'
  return 'open'
}

function openUnit(u: ManifestUnit): void {
  const a = current.value!
  if (unitState(u) === 'lock') { app.showToast('请先完成前面的内容来解锁'); return }
  if (u.type === 'story' || u.type === 'bond') {
    app.goto('story', { activityId: a.id, unitId: u.id })
  } else if (u.type === 'momotalk') {
    app.goto('momotalk', { activityId: a.id, unitId: u.id })
  } else if (u.type === 'minigame') {
    if (!u.minigameType || !registeredTypes().includes(u.minigameType)) {
      app.showToast('该小游戏类型尚未实现（V2 路线图）')
      return
    }
    app.goto('minigame', { activityId: a.id, unitId: u.id })
  }
}

function unitNote(u: ManifestUnit): string {
  if (u.type === 'minigame') {
    const best = progress.bestScore(u.id)
    return best > 0 ? `最高分 ${best}` : '可游玩'
  }
  return ''
}
</script>

<template>
  <div class="browser">
    <div class="browser-bg"></div>
    <div class="topbar">
      <button class="btn ghost" @click="app.back()">← 返回</button>
      <div class="title">活动列表</div>
    </div>

    <div class="layout">
      <!-- 活动选择列 -->
      <div class="acts">
        <div v-for="a in activities" :key="a.id" class="act-card" :class="{ on: a.id === currentId }"
          @click="currentId = a.id">
          <img :src="manifestResolver.srcOf(a.meta.banner)" :alt="a.meta.title" />
          <div class="act-meta">
            <div class="act-title">{{ a.meta.title }}</div>
            <span class="badge" :class="a.meta.status">{{ a.meta.status === 'active' ? '进行中' : '补档 recap' }}</span>
          </div>
        </div>
        <div class="act-note panel">
          {{ activities.find(a => a.id === currentId)?.meta.summary }}
        </div>
      </div>

      <!-- 内容单元 -->
      <div v-if="grouped" class="units">
        <div class="sec">
          <div class="sec-title">剧情</div>
          <div v-for="u in grouped.stories" :key="u.id" class="unit" :class="unitState(u)"
            @click="openUnit(u)">
            <span class="u-type">{{ typeLabel[u.type] }}</span>
            <span class="u-title">{{ u.title }}</span>
            <span v-if="unitState(u) === 'done'" class="badge done">已读</span>
            <span v-else-if="unitState(u) === 'lock'" class="badge lock">未解锁</span>
            <span v-else class="badge">未读</span>
          </div>
        </div>

        <div v-if="grouped.bonds.length" class="sec">
          <div class="sec-title">后话 · 羁绊</div>
          <div v-for="u in grouped.bonds" :key="u.id" class="unit" :class="unitState(u)" @click="openUnit(u)">
            <span class="u-type">{{ typeLabel[u.type] }}</span>
            <span class="u-title">{{ u.title }}</span>
            <span v-if="unitState(u) === 'done'" class="badge done">已读</span>
            <span v-else-if="unitState(u) === 'lock'" class="badge lock">通关第4话解锁</span>
            <span v-else class="badge">NEW</span>
          </div>
        </div>

        <div class="sec">
          <div class="sec-title">桃信</div>
          <div v-for="u in grouped.momotalk" :key="u.id" class="unit" :class="unitState(u)" @click="openUnit(u)">
            <span class="u-type">{{ typeLabel[u.type] }}</span>
            <span class="u-title">{{ u.title }}</span>
            <span class="badge">查看</span>
          </div>
        </div>

        <div v-if="grouped.minigames.length" class="sec">
          <div class="sec-title">小游戏</div>
          <div v-for="u in grouped.minigames" :key="u.id" class="unit" :class="unitState(u)" @click="openUnit(u)">
            <span class="u-type">{{ typeLabel[u.type] }}</span>
            <span class="u-title">{{ u.title }}</span>
            <span class="badge">{{ unitNote(u) }}</span>
          </div>
        </div>

        <div v-if="current?.meta.status === 'recap'" class="recap-hint">
          <span class="badge recap">recap</span>
          本活动处于补档状态：按入口表现规则，小游戏入口已隐藏，剧情回顾仍可浏览。
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.browser { position: absolute; inset: 0; }
.browser-bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(1000px 460px at 82% 10%, rgba(79,195,255,.10), transparent 60%),
    #0b1526;
}
.layout {
  position: absolute; inset: 64px 26px 24px;
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 22px;
}
.acts { display: flex; flex-direction: column; gap: 14px; overflow: auto; }
.act-card {
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  background: var(--panel);
  cursor: pointer;
  transition: all .16s ease;
  opacity: .75;
}
.act-card.on { opacity: 1; border-color: var(--accent); box-shadow: 0 8px 26px rgba(47,143,224,.22); }
.act-card img { width: 100%; height: 108px; object-fit: cover; display: block; }
.act-meta { padding: 10px 14px 12px; display: flex; align-items: center; justify-content: space-between; }
.act-title { font-size: 15px; font-weight: 700; }
.act-note { padding: 12px 14px; font-size: 12.5px; line-height: 1.7; color: var(--text-dim); }
.units { display: flex; flex-direction: column; gap: 18px; overflow: auto; padding-right: 6px; }
.sec-title { font-size: 13px; color: var(--accent); letter-spacing: .28em; margin-bottom: 8px; }
.unit {
  display: flex; align-items: center; gap: 12px;
  padding: 13px 16px;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--panel);
  cursor: pointer;
  transition: all .15s ease;
  margin-bottom: 8px;
}
.unit:hover { border-color: var(--accent); transform: translateX(4px); }
.unit.lock { opacity: .55; }
.unit.lock:hover { transform: none; border-color: var(--line); }
.u-type {
  font-size: 11px; color: #0b1526; font-weight: 700;
  background: var(--accent); padding: 2px 8px; border-radius: 6px; letter-spacing: .1em;
}
.unit.bond .u-type { background: var(--accent2); }
.unit .u-title { flex: 1; font-size: 15px; }
.recap-hint {
  display: flex; align-items: center; gap: 10px;
  font-size: 12.5px; color: var(--text-dim);
  border: 1px dashed rgba(255, 210, 87, .4);
  padding: 12px 14px; border-radius: 12px;
}
</style>
