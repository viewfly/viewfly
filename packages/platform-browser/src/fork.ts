import { Component, makeError, NativeRenderer, onDestroy, provide, RootNode, Viewfly } from '@viewfly/core'

import { DomRenderer } from './dom-renderer'

const forkErrorFn = makeError('fork')

export function fork(host: HTMLElement, root: RootNode) {
  let parentComponent: Component
  try {
    parentComponent = provide([])
  } catch {
    throw forkErrorFn('The fork function can only be called synchronously within a component.')
  }
  const app = new Viewfly({
    host,
    root,
    context: parentComponent,
    providers: [
      {
        provide: NativeRenderer,
        useClass: DomRenderer
      }
    ]
  })
  onDestroy(() => {
    app.destroy()
  })
  return app
}

