// postinstall: 将 sql.js 的 wasm 拷贝到 public/wasm，保证完全离线（不使用任何 CDN）
import { createRequire } from 'node:module'
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const distDir = dirname(require.resolve('sql.js/dist/sql-wasm.wasm'))
const destDir = join(root, 'public', 'wasm')
mkdirSync(destDir, { recursive: true })
// sql.js 1.15+ 的浏览器构建请求 sql-wasm-browser.wasm，两种变体一并拷贝以保证离线
for (const name of ['sql-wasm.wasm', 'sql-wasm-browser.wasm']) {
  copyFileSync(join(distDir, name), join(destDir, name))
}
console.log('[copy-wasm] public/wasm/*.wasm ready')
