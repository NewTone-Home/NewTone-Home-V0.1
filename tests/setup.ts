import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'

if (!globalThis.CSS) {
  Object.defineProperty(globalThis, 'CSS', { value: {} })
}
if (!globalThis.CSS.escape) {
  globalThis.CSS.escape = (value: string) => value.replace(/["\\]/g, '\\$&')
}
