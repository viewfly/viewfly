import { Viewfly, NativeRenderer, Component, JSXElement, JSXFragment } from '@viewfly/core'
import { DomRenderer } from './dom-renderer'

export function createApp(host: HTMLElement, root: () => Component | JSXElement | JSXFragment) {
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
  return {
    destroy() {
      injector.destroy()
    }
  }
}
