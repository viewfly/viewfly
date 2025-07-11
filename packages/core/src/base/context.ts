import {
  AbstractType, ClassProvider, ExistingProvider,
  ExtractValueType, FactoryProvider,
  InjectFlags,
  InjectionToken,
  Injector,
  NullInjector,
  Provider,
  ReflectiveInjector,
  Scope,
  THROW_IF_NOT_FOUND,
  Type, ValueProvider
} from '../di/_api'
import { jsx, Props } from './jsx-element'
import { Component, ComponentSetup, getCurrentInstance } from './component'
import { watch } from '../reactive/watch'

const injectMap = new WeakMap<Component, ReflectiveInjector>()

function getInjector(start: Component | null) {
  while (start) {
    const injector = injectMap.get(start)
    if (injector) {
      return injector
    }
    start = start.parentComponent
  }
  return new NullInjector()
}

export function createContext(providers: Provider[], scope?: Scope | null, parentInjector?: Injector) {
  return function context(props: Props) {
    const instance = getCurrentInstance()
    const injector = new ReflectiveInjector(
      parentInjector || getInjector(instance),
      providers,
      scope
    )
    injectMap.set(instance, injector)
    return () => {
      return props.children
    }
  }
}

export interface ContextProviderParams<T> {
  provide: Type<T> | AbstractType<T> | InjectionToken<T>
}

export interface ContextProvider<T> extends Props {
  useClass?: ClassProvider<T>['useClass']
  useFactory?: FactoryProvider<T>['useFactory']
  useValue?: ValueProvider<T>['useValue']
  useExisting?: ExistingProvider<T>['useExisting']
}

export function createContextProvider<T>(params: ContextProviderParams<T>) {
  return function contextProvider(props: ContextProvider<T>) {
    let Context = createContext([{
      provide: params.provide,
      ...props as any
    }])

    watch(() => {
      return props.useClass || props.useFactory || props.useValue || props.useExisting
    }, () => {
      Context = createContext([{
        provide: params.provide,
        ...props as any
      }])
    })
    return () => {
      return jsx(Context, {children: props.children})
    }
  }
}


/**
 * 通过组件上下文获取 IoC 容器内数据的勾子方法
 */
export function inject<T extends Type<any> | AbstractType<any> | InjectionToken<any>, U = never>(
  token: T,
  notFoundValue: U = THROW_IF_NOT_FOUND as U,
  flags?: InjectFlags,
): ExtractValueType<T> | U {
  const component = getCurrentInstance()
  const injector = getInjector(component)
  return injector.get(token, notFoundValue, flags)
}

export interface ComponentAnnotation {
  scope?: Scope
  providers?: Provider[]
}

/**
 * 给组件添加注解
 * @param annotation
 * @param componentSetup
 * @example
 * ```ts
 * export customScope = new Scope('scopeName')
 * export const App = withAnnotation({
 *   scope: customScope,
 *   providers: [
 *     ExampleService
 *   ]
 * }, function(props: Props) {
 *   return () => {
 *     return <div>...</div>
 *   }
 * })
 * ```
 */
export function withAnnotation<T extends ComponentSetup>(annotation: ComponentAnnotation, componentSetup: T): T {
  return function (props: any) {
    const instance = getCurrentInstance()
    const parentInjector = injectMap.get(instance) || getInjector(instance.parentComponent)
    const injector: ReflectiveInjector = new ReflectiveInjector(parentInjector, [{
      provide: Injector,
      useFactory() {
        return injector
      }
    }, ...(annotation.providers || [])], annotation.scope)

    injectMap.set(instance, injector)
    return componentSetup(props)
  } as T
}
