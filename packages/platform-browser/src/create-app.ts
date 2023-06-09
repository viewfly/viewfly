import { Viewfly, NativeRenderer, JSXTemplate } from '@viewfly/core'
import { DomRenderer } from './dom-renderer'

export function createApp(host: HTMLElement, root: () => JSXTemplate, autoUpdate = true) {
  const injector = new Viewfly({
    host,
    root,
    autoUpdate,
    providers: [
      {
        provide: NativeRenderer,
        useClass: DomRenderer
      }
    ]
  })

  injector.start()
  return injector
}
