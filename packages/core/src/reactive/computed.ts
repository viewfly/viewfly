import { Dep, popDepContext, pushDepContext, registryComponentDestroyCallback } from './dep'
import { internalWrite, readonlyProxyHandler } from './reactive'

export interface Computed<T> {
  readonly value: T
}

export function computed<T>(callback: () => T, isContinue?: (data: T) => unknown): Computed<T> {
  let isStop = false
  const dep = new Dep(() => {
    if (isStop) {
      return
    }
    isStop = true
    dep.destroy()
    pushDepContext(dep)
    const value = callback()
    popDepContext()
    internalWrite(() => {
      (proxy as ({value: any})).value = value
    })
    canListen(value)
    isStop = false
  })
  pushDepContext(dep)
  const value = callback()
  popDepContext()
  const proxy = new Proxy({
    value
  }, readonlyProxyHandler) as Computed<T>

  function canListen(value: T) {
    if (isContinue) {
      const b = isContinue(value)
      if (b === false) {
        dep.destroy()
        return false
      }
    }
    return true
  }

  if (!canListen(value)) {
    return proxy
  }

  registryComponentDestroyCallback(() => {
    dep.destroy()
  })

  return proxy
}
