import { AbstractType, Type } from './type'
import { InjectionToken } from './injection-token'

/**
 * 查找规则
 */
export enum InjectFlags {
  /** 默认查找规则 */
  Default = 'Default',
  /** 锁定当前容器 */
  Self = 'Self',
  /** 跳过当前容器 */
  SkipSelf = 'SkipSelf',
  /** 可选查找 */
  Optional = 'Optional'
}

/**
 * DI 容器抽象基类
 */
export abstract class Injector {
  abstract parentInjector: Injector | null

  abstract get<T>(token: Type<T> | AbstractType<T> | InjectionToken<T>, notFoundValue?: T, flags?: InjectFlags): T
}


