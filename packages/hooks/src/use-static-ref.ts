import { Ref } from '@viewfly/core'

const initValue = {}

export class StaticRef<T> extends Ref<T> {
  readonly current!: T | null

  constructor() {
    let value: any = initValue
    let isInit = false
    super(v => {
      if (v !== initValue && !isInit) {
        value = v
        isInit = true
      }
    })

    Object.defineProperty(this, 'current', {
      get() {
        if (value === initValue) {
          return null
        }
        return value
      }
    })
  }
}

export function useStaticRef<T>() {
  return new StaticRef<T>()
}
