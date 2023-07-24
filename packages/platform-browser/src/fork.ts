import {
  inject,
  Injector,
  JSXInternal,
  makeError,
  NativeRenderer,
  onDestroy,
  THROW_IF_NOT_FOUND,
  Viewfly,
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

  const app = new Viewfly({
    root,
    context: injector,
    autoUpdate
  })

  app.provide([{
    provide: NativeRenderer,
    useClass: DomRenderer
  }])
  onDestroy(() => {
    app.destroy()
  })
  return app
}

