import { ComponentInstance } from './component'
import { createShallowReadonlyProxy, internalWrite } from '../reactive/reactive'
import { RefProp } from './types'
import { makeError } from '../_utils/make-error'

const refErrorFn = makeError('Ref')

export type ExtractInstanceType<
  T,
  U = T extends (...args: any) => any ? ReturnType<T> : T
> = U extends ComponentInstance ? Omit<U, keyof ComponentInstance> : U extends Function ? never : T

export interface DynamicRef<T> {
  (value: T): void | (() => void)
}

/**
 * 创建一个动态 ref，当 ref 的绑定的元素或组件初始化后，会调用副作用函数，并把元素或组件的实例作为参数传入。
 * @param effect 用于接收实例的副作用函数，该函数还可以返回一个清理副作用的函数，当元素或组件销毁时调用
 * @returns 一个函数，用于清理副作用
 * @example
 * ```tsx
 * function App() {
 *   const ref = createDynamicRef<HTMLDivElement>((node) => {
 *     console.log(node)
 *     return () => {
 *       console.log('destroy')
 *     }
 *   })
 *   return () => {
 *     return <div ref={ref}>test</div>
 *   }
 * }
 * ```
 * @example
 * ```tsx
 * function Child() {
 *   return {
 *     show() {
 *       console.log('show')
 *     },
 *     render() {
 *       return <div>child</div>
 *     }
 *   }
 * }
 * function App() {
 *   const ref = createDynamicRef<typeof Child>((child) => {
 *     child.show()
 *     return () => {
 *       console.log('destroy')
 *     }
 *   })
 *   return () => {
 *     return <Child ref={ref}/>
 *   }
 * }
 * ```
 */
export function createDynamicRef<T, U = ExtractInstanceType<T>>(effect: DynamicRef<U>) {
  return effect
}

export type Ref<T> = {readonly value: T}
/**
 * 创建一个引用对象，并添加到 JSX 节点上属性上，当组件渲染后，即可通过 .value 获取到绑定节点的实例
 * - 当绑定到虚拟 DOM 元素节点上时，value 为当前节点的 DOM 元素
 * - 当绑定到组件节点上时，value 为组件函数返回的对象
 * @example
 * ```tsx
 * function App() {
 *   const ref = createRef<HTMLDivElement>()
 *   onMounted(() => {
 *      console.log(ref.value)
 *   })
 *   return () => {
 *     return <div ref={ref}>...</div>
 *   }
 * }
 * ```
 * @example
 * ```tsx
 * function Child() {
 *   return {
 *     show() {
 *       console.log('show')
 *     },
 *     render() {
 *       return <div>child</div>
 *     }
 *   }
 * }
 * function App() {
 *   const ref = createRef<typeof Child>()
 *   onMounted(() => {
 *      ref.value?.show()
 *   })
 *   return () => {
 *     return <Child ref={ref}/>
 *   }
 * }
 * ```
 */
export function createRef<T, U = ExtractInstanceType<T> | null>(): Ref<U | null> {
  return createShallowReadonlyProxy({ value: null })
}

export type RefEffects = Map<RefProp<any>, (() => void) | void>

export function applyRefs(ref: RefProp<any> | RefProp<any>[],
                          value: object,
                          refEffects: RefEffects) {
  if (!ref) {
    return
  }
  const refs = toRefs(ref)
  const length = refs.length
  for (let i = 0; i < length; i++) {
    bindRefs(refs[i], value, refEffects)
  }
}

export function updateRefs(ref: RefProp<any> | RefProp<any>[],
                           value: object,
                           refEffects: RefEffects) {
  if (!ref) {
    refEffects.forEach((fn, oldRef) => {
      refEffects.delete(oldRef)
      if (typeof fn === 'function') {
        fn()
      }
    })
    return
  }
  const newRefs = toRefs(ref)
  refEffects.forEach((fn, oldRef) => {
    if (newRefs.includes(oldRef)) {
      return
    }
    refEffects.delete(oldRef)
    if (typeof fn === 'function') {
      fn()
    }
  })
  const len = newRefs.length
  for (let i = 0; i < len; i++) {
    const newRef = newRefs[i]
    if (refEffects.has(newRef)) {
      continue
    }
    bindRefs(newRef, value, refEffects)
  }
}

function toRefs(ref: any): RefProp<any>[] {
  return Array.isArray(ref) ? ref : [ref]
}

function bindRefs(ref: RefProp<any>,
                  value: object,
                  refEffects: Map<RefProp<any>, (() => void) | void>) {
  const type = typeof ref
  if (type === 'function') {
    const fn = (ref as (i: any) => any)(value)
    refEffects.set(ref, fn)
  } else if (type === 'object') {
    internalWrite(() => {
      (ref as {value: any}).value = value
    })
    refEffects.set(ref, () => {
      internalWrite(() => {
        (ref as {value: any}).value = null
      })
    })
  } else {
    throw refErrorFn('ref must be a function or `Ref<T>` object!')
  }
}
