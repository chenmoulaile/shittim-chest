import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
// 蓝图要求：vue3-pixi 引入了自定义标签与事件语法，
// 必须把它的 compilerOptions 传给 Vue 插件，避免 PixiJS 自定义元素警告
import { compilerOptions } from 'vue3-pixi/compiler'

export default defineConfig({
  // 使用相对路径，便于构建产物部署在任意静态目录下离线运行
  base: './',
  plugins: [
    vue({
      template: { compilerOptions },
    }),
  ],
  server: { port: 5173, strictPort: false },
  preview: { port: 4173, strictPort: false },
  build: {
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 4096,
  },
})
