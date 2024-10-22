export class Listener {
  destroyCallbacks: Array<() => void> = []

  constructor(public effect: () => any) {
  }

  destroy() {
    this.destroyCallbacks.forEach(fn => fn())
    this.destroyCallbacks = []
  }
}

const listeners: Listener[] = []

export function getCurrentListener(): Listener | void {
  return listeners.at(-1)
}

export function pushListener(listener: Listener): void {
  listeners.push(listener)
}

export function popListener(): void {
  listeners.pop()
}
