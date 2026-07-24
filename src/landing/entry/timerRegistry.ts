// 移植自 V0.0 src/transitions/transitionUtils.js —— 一组可整体清理的 setTimeout。
// 入口仪式的多段时序都挂在同一个 registry 上,卸载/取消时一次清空,避免竞态。
export interface TimerRegistry {
  add: (fn: () => void, delay: number) => number
  clear: (id: number) => void
  clearAll: () => void
}

export function createTimerRegistry(): TimerRegistry {
  const timers = new Set<number>()
  return {
    add(fn, delay) {
      const id = window.setTimeout(() => {
        timers.delete(id)
        fn()
      }, delay)
      timers.add(id)
      return id
    },
    clear(id) {
      if (timers.has(id)) {
        window.clearTimeout(id)
        timers.delete(id)
      }
    },
    clearAll() {
      timers.forEach((id) => window.clearTimeout(id))
      timers.clear()
    },
  }
}
