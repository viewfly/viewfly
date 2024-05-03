/**
 * 生成自定义依赖注入 token 的类
 */

/* eslint-disable-next-line */
export class InjectionToken<T> {
  constructor(public readonly description: string) {
  }

  toString() {
    return this.description || '[anonymous injection token]'
  }
}
