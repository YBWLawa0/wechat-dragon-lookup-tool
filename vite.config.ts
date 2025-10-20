import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from 'vite-plugin-singlefile' // 引入插件

export default defineConfig({
  plugins: [vue(), viteSingleFile()], // 启用单文件打包
  base: './',
  build: {
    target: 'esnext', // 确保兼容性
    assetsInlineLimit: 100000000, // 超大资源也内嵌（避免生成外部文件）
  }
})