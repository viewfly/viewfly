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
import { Component, getCurrentInstance } from './component'

const injectMap = new WeakMap<Component, Injector>()

function getParentInjector(component: Component) {
  let start = component.parentComponent
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
      parentInjector || getParentInjector(instance),
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
  const injector = getParentInjector(component)
  return injector.get(token, notFoundValue, flags)
}
