import {
  inject,
  Injector,
  JSXInternal,
  makeError,
  onUnmounted,
  THROW_IF_NOT_FOUND,
  viewfly,
  InjectFlags
} from '@viewfly/core'

import { DomRenderer } from './dom-renderer'

const forkErrorFn = makeError('fork')

export function fork(root: JSXInternal.Element, autoUpdate = true) {
  let injector: Injector
  try {
    injector = inject(Injector, THROW_IF_NOT_FOUND, InjectFlags.Default)
  } catch {
    throw forkErrorFn('The fork function can only be called synchronously within a component.')
  }

  const app = viewfly({
    root,
    context: injector,
    autoUpdate,
    nativeRenderer: new DomRenderer()
  })

  onUnmounted(() => {
    app.destroy()
  })
  return app
}

