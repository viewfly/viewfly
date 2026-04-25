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

/**
 * 创建一个上下文，用于在组件之间共享数据
 * @param providers 提供者，用于提供数据
 * @param scope 作用域，用于限制提供者的作用域
 * @param parentInjector 父注入器，用于自定义父注入器，默认从当前组件树中自动获取
 * @returns 一个上下文组件，组件的子元素都可以通过 inject 获取到提供者提供的数据
 * @example
 * ```tsx
 * @Injectable()
 * class ExampleService {}
 *
 * function Child(props) {
 *   const exampleService = inject(ExampleService)
 *   console.log(exampleService)
 *   return () => {
 *     return <div>{props.children}</div>
 *   }
 * }
 * function App() {
 *   const Context = createContext([
 *     ExampleService
 *   ])
 *   return () => {
 *     return <Context>
 *       <Child>test</Child>
 *     </Context>
 *   }
 * }
 * ```
 */
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

/**
 * 创建一个上下文提供者组件，组件的子元素都可以通过 inject 获取到提供者提供的数据
 * @param params 提供者参数
 * @returns 一个上下文提供者组件，组件的子元素都可以通过 inject 获取到提供者提供的数据
 * @example
 * ```tsx
 * const ExampleService = createContextProvider({
 *   provide: ExampleService
 * })
 * 
 * function Child() {
 *   const exampleService = inject(ExampleService)
 *   console.log(exampleService)
 *   return () => {
 *     return <div>{exampleService.name}</div>
 *   }
 * }
 * 
 * function App() {
 *   const value = new ExampleService()
 *   return () => {
 *     return <ExampleService useValue={value}>
 *       <Child/>
 *     </ExampleService>
 *   }
 * }
 */
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
 * @param token 注入的 token
 * @param notFoundValue 未找到时的值
 * @param flags 注入标志
 * @returns 注入的值
 * @example
 * ```tsx
 * function ChildComponent() {
 *   const exampleService = inject(ExampleService)
 *   console.log(exampleService)
 *   return () => {
 *     return <div>{exampleService.name}</div>
 *   }
 * }
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
