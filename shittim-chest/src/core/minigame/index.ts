/**
 * 小游戏运行时入口：先完成注册表初始化，再导入具体模块完成自注册。
 * 视图层统一从本文件导入，避免循环依赖。
 */
export * from './runtime'
import './modules/serenadeStage'
