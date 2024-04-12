import { Dep, popDepContext, pushDepContext, registryComponentDestroyCallback } from './dep'

export function watch<T>(trigger: () => T,
                         callback: (newValue: T, oldValue: T) => (() => any) | void) {

  let prevFn: (() => any) | void
  const dep = new Dep(() => {
    pushDepContext(dep)
    const newValue = trigger()
    popDepContext()
    if (newValue === oldValue) {
      return
    }
    if (prevFn) {
      prevFn()
    }
    prevFn = callback(newValue, oldValue)
    oldValue = newValue
  })
  pushDepContext(dep)
  let oldValue: T = trigger()
  popDepContext()

  dep.destroyCallbacks.push(() => {
    prevFn?.()
  })

  function unWatch() {
    dep.destroy()
  }
  registryComponentDestroyCallback(unWatch)
  return unWatch
}
