import { Viewfly, NativeRenderer, Component, JSXElement, JSXFragment } from '@viewfly/core'
import { DomRenderer } from './dom-renderer'

export function createApp(root: () => Component | JSXElement | JSXFragment, host: HTMLElement) {
  const injector = new Viewfly({
    host,
    root,
    providers: [
      {
        provide: NativeRenderer,
        useClass: DomRenderer
      }
    ]
  })

  injector.start()
}
