import { NativeNode } from './injection-tokens'

const containerStack: NativeNode[] = []

export function pushContainer(container: NativeNode) {
  containerStack.push(container)
}

export function popContainer() {
  containerStack.pop()
}

export function getContainer() {
  return containerStack[containerStack.length - 1]
}
