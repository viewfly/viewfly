import {
  ClassProvider,
  ConstructorProvider,
  ExistingProvider,
  FactoryProvider,
  Provider,
  TypeProvider,
  ValueProvider
} from './provider'
import { Injector } from './injector'
import { Inject, Optional, Self, SkipSelf } from './metadata'
import { Type } from './type'
import { getAnnotations } from './utils/decorators'
import { stringify } from './utils/stringify'
import { Injectable, ProvideScope } from './injectable'
import { InjectionToken } from './injection-token'

export interface ReflectiveDependency {
  injectKey: any
  visibility: SkipSelf | Self | null
  optional: boolean
}

export interface NormalizedProvider {
  provide: any
  generateFactory: (injector: Injector, cacheFn: (token: any, value: any) => void) => (...args: any[]) => any
  deps: ReflectiveDependency[]
  scope: ProvideScope | null
}

/**
 * 标准化 provide，并返回统一数据结构
 * @param provider
 */
export function normalizeProvider(provider: Provider): NormalizedProvider {
  if ((provider as ValueProvider).useValue) {
    return normalizeValueProviderFactory(provider as ValueProvider)
  }
  if ((provider as ClassProvider).useClass) {
    return normalizeClassProviderFactory(provider as ClassProvider)
  }
  if ((provider as ExistingProvider).useExisting) {
    return normalizeExistingProviderFactory(provider as ExistingProvider)
  }
  if ((provider as FactoryProvider).useFactory) {
    return normalizeFactoryProviderFactory(provider as FactoryProvider)
  }
  if ((provider as ConstructorProvider).provide) {
    if ((provider as ConstructorProvider).provide instanceof InjectionToken) {
      return normalizeValueProviderFactory(provider as ValueProvider)
    }
    return normalizeConstructorProviderFactory(provider as ConstructorProvider)
  }
  return normalizeTypeProviderFactory(provider as TypeProvider)
}

function normalizeValueProviderFactory(provider: ValueProvider): NormalizedProvider {
  return {
    provide: provider.provide,
    scope: null,
    generateFactory() {
      return function () {
        return provider.useValue
      }
    },
    deps: []
  }
}

function normalizeClassProviderFactory(provider: ClassProvider): NormalizedProvider {
  let deps: ReflectiveDependency[]
  let provideIn: ProvideScope | null = null
  if (provider.deps) {
    deps = normalizeDeps(provider.provide, provider.deps)
  } else {
    const resolvedClass = resolveClassParams(provider.useClass)
    provideIn = resolvedClass.scope
    deps = normalizeDeps(provider.provide, resolvedClass.deps)
  }
  return {
    provide: provider.provide,
    scope: provideIn,
    deps,
    generateFactory(injector, cacheFn) {
      return function (...args: any[]) {
        const instance = new provider.useClass(...args)
        cacheFn(provider.provide, instance)
        const propMetadataKeys = getAnnotations(provider.useClass).getPropMetadataKeys()
        propMetadataKeys.forEach(key => {
          const propsMetadata = getAnnotations(provider.useClass).getPropMetadata(key)!
          propsMetadata.forEach(item => {
            item.contextCallback(instance, item.propertyKey, item.injectToken, injector)
          })
        })
        return instance
      }
    }
  }
}

function normalizeExistingProviderFactory(provider: ExistingProvider): NormalizedProvider {
  return {
    provide: provider.provide,
    scope: null,
    generateFactory(injector: Injector) {
      return function () {
        return injector.get(provider.useExisting)
      }
    },
    deps: []
  }
}

function normalizeFactoryProviderFactory(provider: FactoryProvider): NormalizedProvider {
  return {
    provide: provider.provide,
    scope: null,
    generateFactory() {
      return function (...args: any[]) {
        return provider.useFactory(...args)
      }
    },
    deps: normalizeDeps(provider.provide, provider.deps || [])
  }
}

function normalizeConstructorProviderFactory(provider: ConstructorProvider): NormalizedProvider {
  return normalizeClassProviderFactory({
    ...provider,
    useClass: provider.provide
  })
}

function normalizeTypeProviderFactory(provider: TypeProvider): NormalizedProvider {
  return normalizeClassProviderFactory({
    provide: provider,
    useClass: provider
  })
}

function resolveClassParams(construct: Type<any>) {
  const annotations = getAnnotations(construct)
  const metadata = annotations.getClassMetadata(Injectable)
  if (typeof metadata === 'undefined') {
    throw new Error(`Class \`${stringify(construct)}\` is not injectable!`)
  }
  const deps = (metadata.paramTypes || []).map(i => [i])
  const metadataKeys = [Inject, Self, SkipSelf, Optional]
  metadataKeys.forEach(key => {
    (annotations.getParamMetadata(key) || []).forEach(item => {
      deps[item.parameterIndex].push(item.metadata)
    })
  })
  return {
    scope: metadata.metadata.provideIn,
    deps
  }
}

function normalizeDeps(provide: any, deps: any[]): ReflectiveDependency[] {
  return deps.map((dep, index) => {
    const r: ReflectiveDependency = {
      injectKey: null,
      optional: false,
      visibility: null
    }
    if (!Array.isArray(dep)) {
      r.injectKey = dep
    } else {
      for (let i = 0; i < dep.length; i++) {
        const item = dep[i]
        if (item instanceof Inject) {
          r.injectKey = item.token
        } else if (item instanceof Self || item instanceof SkipSelf) {
          r.visibility = item
        } else if (item instanceof Optional) {
          r.optional = true
        } else {
          r.injectKey = item
        }
      }
    }
    if (typeof r.injectKey === 'undefined') {
      throw new Error(`The ${index} th dependent parameter type of \`${stringify(provide)}\` was not obtained,
if the dependency is declared later, you can refer to it using \`constructor(@Inject(forwardRef(() => [Type|InjectionToken])) paramName: [Type]) {}\``)
    }
    return r
  })
}
