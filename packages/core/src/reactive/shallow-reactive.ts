import { getStringType } from './_help'
import {
  ArrayReactiveHandler,
  isReactive,
  MapReactiveHandler,
  ObjectReactiveHandler,
  shallowProxyToRawCache,
  shallowRawToProxyCache,
  SetReactiveHandler,
} from './reactive'

export const defaultShallowObjectReactiveHandler = new ObjectReactiveHandler({
  readonly: false,
  shallow: true
})

export const defaultShallowArrayReactiveHandler = new ArrayReactiveHandler({
  readonly: false,
  shallow: true
})

export const defaultShallowMapReactiveHandler = new MapReactiveHandler({
  readonly: false,
  shallow: true
})

export const defaultShallowSetReactiveHandler = new SetReactiveHandler({
  readonly: false,
  shallow: true
})

export function shallowReactive<T>(raw: T): T {
  if (isReactive(raw)) {
    return raw
  }
  let proxy = shallowRawToProxyCache.get(raw as object)
  if (proxy) {
    return proxy
  }
  const type = getStringType(raw)
  switch (type) {
    case '[object Object]':
      proxy = new Proxy(raw as any, defaultShallowObjectReactiveHandler)
      break
    case '[object Array]':
      proxy = new Proxy(raw as any, defaultShallowArrayReactiveHandler)
      break
    case '[object Set]':
    case '[object WeakSet]':
      proxy = new Proxy(raw as any, defaultShallowSetReactiveHandler)
      break
    case '[object Map]':
    case '[object WeakMap]':
      proxy = new Proxy(raw as any, defaultShallowMapReactiveHandler)
      break
    default:
      return raw
  }
  shallowRawToProxyCache.set(raw as any, proxy)
  shallowProxyToRawCache.set(proxy, raw)
  return proxy
}
