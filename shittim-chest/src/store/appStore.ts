import { defineStore } from 'pinia'

export type ViewName = 'boot' | 'menu' | 'activities' | 'story' | 'momotalk' | 'lobby' | 'minigame'

export interface ViewParams {
  activityId?: string
  unitId?: string
  threadId?: string
}

/** 轻量导航仓库：视图切换 + 返回栈 */
export const useAppStore = defineStore('app', {
  state: () => ({
    view: 'boot' as ViewName,
    params: {} as ViewParams,
    backStack: [] as { view: ViewName; params: ViewParams }[],
    toast: '',
    toastTimer: 0 as unknown as ReturnType<typeof setTimeout>,
  }),
  actions: {
    goto(view: ViewName, params: ViewParams = {}, replace = false) {
      if (!replace) this.backStack.push({ view: this.view, params: this.params })
      this.view = view
      this.params = params
    },
    back() {
      const prev = this.backStack.pop()
      if (prev) { this.view = prev.view; this.params = prev.params }
      else this.goto('menu', {}, true)
    },
    showToast(msg: string) {
      this.toast = msg
      clearTimeout(this.toastTimer)
      this.toastTimer = setTimeout(() => { this.toast = '' }, 2600)
    },
  },
})
