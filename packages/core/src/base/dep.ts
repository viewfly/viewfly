export class Dep {
  destroyCallbacks: Array<() => void> = []

  constructor(public effect: () => void, public flushMode: 'sync' | 'async' = 'sync') {
  }

  destroy() {
    this.destroyCallbacks.forEach(callback => callback())
    this.destroyCallbacks = []
  }
}

const deps: Dep[] = []

export function getDepContext() {
  return deps.at(-1)
}

export function pushDepContext(dep: Dep): void {
  deps.push(dep)
}

export function popDepContext(): void {
  deps.pop()
}
