import { Viewfly, Component, JSXElement, NativeRenderer } from '@viewfly/core'
import { DomRenderer } from './dom-renderer'

export function createApp(root: Component | JSXElement, host: HTMLElement) {
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
