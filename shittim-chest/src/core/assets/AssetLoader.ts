import { Assets } from 'pixi.js'
import type { ContentManifest } from '../manifest/types'

/**
 * 基于 PixiJS v8 资产系统的加载器（验收项：无远程请求 / 离线可用性）
 * - Assets.init 使用本地清单的 bundles 定义，basePath 指向本地 content 目录
 * - 运行期不发任何远程网络请求，全部资源来自应用自身的静态文件
 */
export class AssetLoader {
  private initialized = false

  async init(manifest: ContentManifest): Promise<void> {
    if (this.initialized) return
    await Assets.init({
      manifest: { bundles: manifest.pixi.bundles },
      basePath: './content/',
    })
    this.initialized = true
  }

  /** 按包预载，聚合进度回调 onProgress(0..1) */
  async loadBundles(names: string[], onProgress?: (p: number) => void): Promise<void> {
    let done = 0
    for (const name of names) {
      await Assets.loadBundle(name, (p) => {
        onProgress?.((done + p) / names.length)
      })
      done += 1
      onProgress?.(done / names.length)
    }
  }

  /** 运行期补充加载某个 bundle（如进入活动时按需加载） */
  async ensureBundles(names: string[], onProgress?: (p: number) => void): Promise<void> {
    await this.loadBundles(names, onProgress)
  }
}

export const assetLoader = new AssetLoader()
