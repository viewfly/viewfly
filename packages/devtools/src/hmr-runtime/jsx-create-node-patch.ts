import type { Component, ComponentSetup } from '@viewfly/core'
import {
  getCurrentInstance,
  JSXNodeFactory,
  onMounted,
} from '@viewfly/core'

type HotEntryLike = {
  holder: { instances: Set<Component> }
}

const boundaryByHotId = new Map<string, ComponentSetup>()

let patched = false

/**
 * 为带 `__vfHotId` 的组件包一层边界组件，在 setup 内用 `onMounted` 登记实例，
 * 替代 core 内对 Component 构造/销毁的 adapter 通知。
 */
export function installHotJsxCreateNodePatch(
  getEntryByHotId: (id: string) => HotEntryLike | undefined,
): void {
  if (patched) {
    return
  }
  patched = true
  const original = JSXNodeFactory.createNode.bind(JSXNodeFactory)
  JSXNodeFactory.createNode = function (type, props, key) {
    if (typeof type === 'function') {
      const hotId = (type as { __vfHotId?: string }).__vfHotId
      if (hotId) {
        let boundary = boundaryByHotId.get(hotId)
        if (!boundary) {
          const inner = type as unknown as ComponentSetup & { __vfHotId: string }
          boundary = function ViewflyHotBoundary(props: unknown) {
            // `onMounted` 回调在 `rendered` 阶段执行，此时已不在 setup 栈内，不能调用 `getCurrentInstance`。
            const instance = getCurrentInstance()
            onMounted(() => {
              const entry = getEntryByHotId(hotId)
              entry?.holder.instances.add(instance)
              return () => {
                entry?.holder.instances.delete(instance)
              }
            })
            return inner(props as never)
          } as ComponentSetup
          boundaryByHotId.set(hotId, boundary)
        }
        type = boundary as typeof type
      }
    }
    return original(type, props, key)
  }
}
