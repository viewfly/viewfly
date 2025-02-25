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
import { jsx, Props } from './jsx-element'
import { Component, ComponentSetup, getCurrentInstance } from './component'
import { onPropsChanged } from './lifecycle'

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


export interface ContextProps extends Props {
  providers: Provider[]
}

/**
 * @deprecated
 * @param props
 */
export function Context(props: ContextProps) {
  function createContextComponent(providers: Provider[]) {
    return withAnnotation({
      providers,
    }, (childProps: Props) => {
      return () => {
        return childProps.children
      }
    })
  }

  let contextComponent = createContextComponent(props.providers)

  onPropsChanged((newProps: ContextProps, oldProps) => {
    if (newProps.providers === oldProps.providers) {
      return
    }
    contextComponent = createContextComponent(newProps.providers)
  })
  return () => {
    return jsx(contextComponent, {
      children: props.children
    })
  }
}
