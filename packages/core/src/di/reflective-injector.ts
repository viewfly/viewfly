import { Provider } from './provider'
import { InjectFlags, Injector } from './injector'
import { NormalizedProvider, normalizeProvider, ReflectiveDependency } from './reflective-provider'
import { Self, SkipSelf } from './metadata'
import { ForwardRef } from './forward-ref'
import { AbstractType, Type } from './type'
import { InjectionToken } from './injection-token'
import { NullInjector, THROW_IF_NOT_FOUND } from './null-injector'
import { Injectable, Scope } from './injectable'
import { getAnnotations } from './utils/decorators'
import { makeError } from '../_utils/make-error'
import { stringify } from './utils/stringify'

const reflectiveInjectorErrorFn = (token: any) => {
  return makeError('ReflectiveInjector')(`No provide for \`${stringify(token)}\`!`)
}
const provideScopeError = (token: any) => {
  return makeError('ProvideScope')(`Can not found provide scope \`${stringify(token)}\`!`)
}

/**
 * 反射注入器
 */
export class ReflectiveInjector extends Injector {
  protected normalizedProviders: NormalizedProvider[]
  protected recordValues = new Map<Type<any> | AbstractType<any> | InjectionToken<any>, any>()

  constructor(public parentInjector: Injector | null,
              protected staticProviders: Provider[],
              protected scope?: Scope) {
    super()
    this.normalizedProviders = staticProviders.map(provide => {
      return normalizeProvider(provide)
    })
  }

  /**
   * 用于获取当前注入器上下文内的实例、对象或数据
   * @param token 访问 token
   * @param notFoundValue 如未查找到的返回值
   * @param flags 查询规则
   */
  get<T>(token: Type<T> | AbstractType<T> | InjectionToken<T>, notFoundValue: T = THROW_IF_NOT_FOUND as T, flags?: InjectFlags): T {
    flags = flags || InjectFlags.Default
    if (flags === InjectFlags.SkipSelf) {
      if (this.parentInjector) {
        return this.parentInjector.get(token, notFoundValue)
      }
      if (notFoundValue !== THROW_IF_NOT_FOUND) {
        return notFoundValue
      }
      throw reflectiveInjectorErrorFn(token)
    }
    if (this.recordValues.has(token)) {
      return this.recordValues.get(token)
    }

    for (let i = 0; i < this.normalizedProviders.length; i++) {
      const normalizedProvider = this.normalizedProviders[i]
      if (normalizedProvider.provide === token) {
        return this.getValue(token, normalizedProvider)
      }
    }

    if (!(token instanceof InjectionToken)) {
      const scope = getAnnotations(token).getClassMetadata(Injectable)?.metadata.provideIn
      if (scope) {
        const normalizedProvider = normalizeProvider(token)
        if (this.scope === scope) {
          this.normalizedProviders.push(normalizedProvider)
          return this.getValue(token, normalizedProvider)
        }
        const parentInjector = this.parentInjector

        if (!parentInjector || parentInjector instanceof NullInjector) {
          if (normalizedProvider.scope === 'root') {
            this.normalizedProviders.push(normalizedProvider)
            return this.getValue(token, normalizedProvider)
          }
          if (notFoundValue !== THROW_IF_NOT_FOUND) {
            return notFoundValue
          }
          throw provideScopeError(normalizedProvider.scope)
        }
      }
    }
    if (flags === InjectFlags.Self) {
      if (notFoundValue === THROW_IF_NOT_FOUND) {
        throw reflectiveInjectorErrorFn(token)
      }
      return notFoundValue
    }
    if (this.parentInjector) {
      return this.parentInjector.get(token, notFoundValue,
        flags === InjectFlags.Optional ? InjectFlags.Optional : InjectFlags.Default)
    }
    if (notFoundValue === THROW_IF_NOT_FOUND) {
      throw reflectiveInjectorErrorFn(token)
    }
    return notFoundValue
  }

  private getValue<T>(token: Type<T> | AbstractType<T> | InjectionToken<T>, normalizedProvider: NormalizedProvider) {
    const { generateFactory, deps } = normalizedProvider
    const params = this.resolveDeps(deps)
    let value = this.recordValues.get(token)
    if (value) {
      return value
    }
    const factory = generateFactory(this, (token: Type<any>, value: any) => {
      this.recordValues.set(token, value)
    })
    value = factory(...params)
    this.recordValues.set(token, value)
    return value
  }

  /**
   * 解决并获取依赖参数
   * @param deps 依赖规则
   * @private
   */
  private resolveDeps(deps: ReflectiveDependency[]): any[] {
    return deps.map(dep => {
      let reflectiveValue: any
      const tryValue = {}
      const injectToken = dep.injectKey instanceof ForwardRef ? dep.injectKey.getRef() : dep.injectKey
      if (dep.visibility instanceof Self) {
        reflectiveValue = this.get(injectToken, tryValue, InjectFlags.Self)
      } else if (dep.visibility instanceof SkipSelf) {
        if (this.parentInjector) {
          reflectiveValue = this.parentInjector.get(injectToken, tryValue)
        } else {
          if (dep.optional) {
            // if (notFoundValue === THROW_IF_NOT_FOUND) {
            //   return null
            // }
            return null
          }
          throw reflectiveInjectorErrorFn(injectToken)
        }
      } else {
        reflectiveValue = this.get(injectToken, tryValue)
      }
      if (reflectiveValue === tryValue) {
        if (dep.optional) {
          // if (notFoundValue === THROW_IF_NOT_FOUND) {
          //   return null
          // }
          // return notFoundValue
          return null
        }
        throw reflectiveInjectorErrorFn(injectToken)
      }
      return reflectiveValue
    })
  }
}
