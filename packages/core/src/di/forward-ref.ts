export class ForwardRef<T = any> {
  constructor(private forwardRefFn: () => T) {
  }

  getRef() {
    return this.forwardRefFn()
  }
}

/**
 * 引用后声明的类的工具函数
 * @param fn
 */
export function forwardRef<T>(fn: () => T) {
  return new ForwardRef<T>(fn)
}
