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
 * 根据 token 推断返回数据类型
 */
export type ExtractValueType<T> = T extends Type<any> ? InstanceType<T> :
  T extends AbstractType<infer K> ? K :
    T extends InjectionToken<infer V> ? V : never

/**
 * DI 容器抽象基类
 */
export abstract class Injector {
  abstract parentInjector: Injector | null

  abstract get<T extends Type<any> | AbstractType<any> | InjectionToken<any>,
    U = ExtractValueType<T>>(token: T, notFoundValue?: U, flags?: InjectFlags): U
}


