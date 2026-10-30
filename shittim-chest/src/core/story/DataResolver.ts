import { Assets, Texture, TextureSource } from 'pixi.js'

/**
 * DataResolver：负责解析叙事脚本、角色表与资源别名 → 纹理
 * （对齐 ba-story-player 的 DataResolver 职责划分）
 */
export class DataResolver {
  async texture(alias: string): Promise<Texture> {
    try {
      const tex = await Assets.load(alias)
      return tex as Texture
    } catch (e) {
      console.warn(`[data] 纹理加载失败: ${alias}`, e)
      return Texture.WHITE
    }
  }

  textureSync(alias: string): Texture {
    const tex = Assets.get(alias)
    return (tex ?? Texture.WHITE) as Texture
  }
}

// 确保 TextureSource 被引用（v8 类型兼容用）
export type { TextureSource }
