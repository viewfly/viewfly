export interface Computed<T> {
  readonly value: T
}

/**
 * 创建一个 computed，当依赖的值发生变化时，会重新计算值。
 * computed 会返回一个对象，对象的 value 属性是计算的值。
 * @param getter 计算函数，用于计算值
 * @returns 一个对象，对象的 value 属性是计算的值
 */
export function computed<T>(getter: () => T): Computed<T> {
  return {
    get value() {
      return getter()
    }
  }
}
