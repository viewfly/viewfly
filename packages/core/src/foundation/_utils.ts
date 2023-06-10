import { Component, JSXElement, Ref } from '../model/_api'

export interface MapChanges {
  remove: [string, any][]
  set: [string, any][]
}

export interface ArrayChanges {
  remove: string[]
  add: string[]
}

export interface ObjectChanges {
  remove: [string, any][]
  add: [string, any][]
}

export const refKey = 'ref'

export function getObjectChanges(target?: Record<string, any>, source?: Record<string, any>) {
  const changes: ObjectChanges = {
    remove: [],
    add: []
  }

  if (!target) {
    if (source) {
      Object.keys(source).forEach(key => {
        changes.remove.push([key, source[key]])
      })
    }
    return changes
  }

  if (!source) {
    Object.keys(target).forEach(key => {
      changes.add.push([key, target[key]])
    })
    return changes
  }

  Object.keys(target).forEach(key => {
    const leftValue = target[key]
    if (!Reflect.has(source, key)) {
      changes.add.push([key, leftValue])
      return
    }
    const rightValue = source[key]
    if (leftValue === rightValue) {
      return
    }
    changes.add.push([key, leftValue])
    changes.remove.push([key, rightValue])
  })

  Object.keys(source).forEach(key => {
    if (!Reflect.has(target, key)) {
      changes.remove.push([key, source[key]])
    }
  })
  return changes
}

export function getMapChanges(target?: Map<string, any>, source?: Map<string, any>) {
  const changes: MapChanges = {
    remove: [],
    set: []
  }
  if (!target) {
    if (source) {
      source.forEach((value, key) => {
        changes.remove.push([key, value])
      })
    }
    return changes
  }
  if (!source) {
    target.forEach((value, key) => {
      changes.set.push([key, value])
    })
    return changes
  }
  target.forEach((value, key) => {
    const rightValue = source.get(key)
    if (value === rightValue) {
      return
    }
    changes.set.push([key, value])
  })

  source.forEach((value, key) => {
    if (key === refKey && value instanceof Ref) {
      const newValue = target.get(key)
      if (value !== newValue) {
        changes.remove.push([key, value])
      }
      return
    }
    if (!target.has(key)) {
      changes.remove.push([key, value])
    }
  })
  return changes
}

export function getSetChanges(target?: Set<string>, source?: Set<string>) {
  const changes: ArrayChanges = {
    add: [],
    remove: []
  }

  if (!target) {
    if (source) {
      source.forEach(i => {
        changes.remove.push(i)
      })
    }
    return changes
  }

  if (!source) {
    target.forEach(i => {
      changes.add.push(i)
    })
    return changes
  }

  target.forEach(i => {
    if (!source.has(i)) {
      changes.add.push(i)
    }
  })
  source.forEach(i => {
    if (!target.has(i)) {
      changes.remove.push(i)
    }
  })
  return changes
}

const compareText = '0'.repeat(8)

export function getNodeChanges(newVNode: JSXElement | Component, oldVNode: JSXElement | Component) {
  const newProps = newVNode.props
  const oldProps = oldVNode.props
  const styleChanges = getMapChanges(newProps?.styles, oldProps?.styles)
  const attrChanges = getMapChanges(newProps?.attrs, oldProps?.attrs)
  const classesChanges = getSetChanges(newProps?.classes, oldProps?.classes)
  const listenerChanges = getObjectChanges(newProps?.listeners, oldProps?.listeners)
  return {
    styleChanges,
    attrChanges,
    classesChanges,
    listenerChanges,
    isChanged: [
      attrChanges.set.length,
      attrChanges.remove.length,
      styleChanges.set.length,
      styleChanges.remove.length,
      classesChanges.add.length,
      classesChanges.remove.length,
      listenerChanges.add.length,
      listenerChanges.remove.length
    ].join('') !== compareText
  }
}
