import { ComponentInstance } from './component'

export interface RefListener<T> {
  (current: T): void | (() => void)
}

export type ExtractInstanceType<
  T,
  U = T extends (...args: any) => any ? ReturnType<T> : T
> = U extends ComponentInstance<any> ? Omit<U, keyof ComponentInstance<any>> : U extends Function ? never : T

export interface AbstractInstanceType<T extends Record<string, any>> {
  (): T & ComponentInstance<any>
}

export class DynamicRef<T> {
  private unBindMap = new Map<T, () => void>()
  private targetCaches = new Set<T>()

  constructor(private callback: RefListener<T>) {
  }

  bind(value: T) {
    if (typeof value !== 'object' || value === null) {
      return
    }
    if (this.targetCaches.has(value)) {
      return
    }
    const unBindFn = this.callback(value)
    if (typeof unBindFn === 'function') {
      this.unBindMap.set(value, unBindFn)
    }
    this.targetCaches.add(value)
  }

  unBind(value: T) {
    this.targetCaches.delete(value)
    const unBindFn = this.unBindMap.get(value)
    this.unBindMap.delete(value)
    if (typeof unBindFn === 'function') {
      unBindFn()
    }
  }
}

/**
 * 用于节点渲染完成时获取 DOM 节点
 * @param callback 获取 DOM 节点的回调函数
 * @example
 * ```tsx
 * function App() {
 *   const ref = createDynamicRef(node => {
 *     function fn() {
 *       // do something...
 *     }
 *     node.addEventListener('click', fn)
 *     return () => {
 *       node.removeEventListener('click', fn)
 *     }
 *   })
 *   return () => {
 *     return <div ref={ref}>xxx</div>
 *   }
 * }
 * ```
 */
export function createDynamicRef<T, U = ExtractInstanceType<T>>(callback: RefListener<U>) {
  return new DynamicRef<U>(callback)
}

export class StaticRef<T> extends DynamicRef<T> {
  get current() {
    return this._current
  }

  private _current: T | null = null

  constructor() {
    super(v => {
      this._current = v
      return () => {
        this._current = null
      }
    })
  }
}

export function createRef<T, U = ExtractInstanceType<T>>() {
  return new StaticRef<U>()
}
