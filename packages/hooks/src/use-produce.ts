import { Signal, useSignal } from '@viewfly/core'
import { produce } from 'immer'

export interface UpdateFn<T> {
  (set: (draft: T) => void | T): void
}

export function useProduce<T extends Record<string, any>>(data: T): [Signal<T>, UpdateFn<T>] {
  const state = useSignal<T>(data)

  function setter(set: (draft: T) => void | T) {
    state.set(produce(state(), set))
  }

  return [
    state,
    setter
  ]
}
