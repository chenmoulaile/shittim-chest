/** 通用补间：rAF 驱动，返回 Promise，供剧情演出/转场使用 */
export function tween(
  dur: number,
  onUpdate: (t: number) => void,
  ease: (t: number) => number = (t) => t,
): Promise<void> {
  return new Promise((resolve) => {
    const start = performance.now()
    let stopped = false
    const step = (now: number) => {
      if (stopped) return
      const t = dur <= 0 ? 1 : Math.min(1, (now - start) / dur)
      try {
        onUpdate(ease(t))
      } catch {
        // 目标对象已随视图销毁（卸载后补间仍在 rAF 队列中）——安全终止本次补间
        stopped = true
        resolve()
        return
      }
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3)
export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

export const wait = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms))

export function randomOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
