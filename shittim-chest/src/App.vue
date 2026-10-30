<script setup lang="ts">
import { computed } from 'vue'
import { useAppStore } from './store/appStore'
import BootScreen from './views/BootScreen.vue'
import MainMenu from './views/MainMenu.vue'
import ActivityBrowser from './views/ActivityBrowser.vue'
import StoryPlayerView from './views/StoryPlayerView.vue'
import MomotalkView from './views/MomotalkView.vue'
import MemoryLobbyView from './views/MemoryLobbyView.vue'
import MinigameView from './views/MinigameView.vue'

const app = useAppStore()

const viewComponent = computed(() => {
  switch (app.view) {
    case 'boot': return BootScreen
    case 'menu': return MainMenu
    case 'activities': return ActivityBrowser
    case 'story': return StoryPlayerView
    case 'momotalk': return MomotalkView
    case 'lobby': return MemoryLobbyView
    case 'minigame': return MinigameView
    default: return BootScreen
  }
})
</script>

<template>
  <div class="app-root">
    <div class="stage">
      <component :is="viewComponent" :key="app.view + (app.params.unitId ?? '')" />
      <transition name="fade">
        <div v-if="app.toast" class="toast">{{ app.toast }}</div>
      </transition>
    </div>
  </div>
</template>
