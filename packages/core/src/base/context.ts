import {
  AbstractType,
  ExtractValueType,
  InjectFlags,
  InjectionToken,
  Injector,
  NullInjector,
  Provider,
  ReflectiveInjector,
  Scope,
  THROW_IF_NOT_FOUND,
  Type
} from '../di/_api'
import { Props } from './jsx-element'
import { Component, ComponentSetup, getCurrentInstance } from './component'

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

export function createContext(providers: Provider[], scope?: Scope, parentInjector?: Injector) {
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

export function withAnnotation<T extends ComponentSetup>(annotation: ComponentAnnotation, component: T): T {
  return function (props: any) {
    const instance = getCurrentInstance()
    const parentInjector = injectMap.get(instance) || getInjector(instance.parentComponent)
    const injector = new ReflectiveInjector(parentInjector, annotation.providers || [], annotation.scope)
    injectMap.set(instance, injector)
    return component(props)
  } as T
}
