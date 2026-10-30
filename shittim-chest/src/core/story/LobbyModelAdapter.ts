/**
 * 记忆大厅模型适配接口（蓝图：动态立绘观赏模式）
 *
 * V1：PlaceholderLobbyModel —— 使用内容包立绘 + 程序化呼吸/视差动画。
 * V2：接入真实资产时，实现 SpineLobbyModel（blue-archive-spine 提取的
 *     .skel/.json 骨骼动画）或 Live2D 适配器，替换本接口即可，
 *     记忆大厅视图层零改动。
 */
export interface LobbyModelAdapter {
  /** 加载模型（Spine .skel/.json 或 Live2D model3.json） */
  load(modelPath: string): Promise<void>
  /** 循环播放待机动画 */
  playIdle(): void
  /** 播放表情/动作（如 "smile"、"surprise"） */
  playExpression(name: string): void
  /** 触摸反馈（坐标为舞台坐标） */
  onTouch(x: number, y: number): void
  destroy(): void
}
