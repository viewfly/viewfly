import {
  inject,
  Injector,
  makeError,
  onUnmounted,
  THROW_IF_NOT_FOUND,
  viewfly,
  InjectFlags,
  JSXNode,
  Application,
  Config
} from '@viewfly/core'

import { DomRenderer } from './dom-renderer'

const forkErrorFn = makeError('fork')

export function fork(root: JSXNode, autoUpdate?: boolean): Application
export function fork(root: JSXNode, config?: Omit<Config, 'nativeRenderer' | 'root'>): Application
export function fork(root: JSXNode, config: any = true) {
  const c: Partial<Config> = { autoUpdate: true }
  if (typeof config === 'boolean') {
    c.autoUpdate = config
  } else if (typeof config === 'object') {
    Object.assign(c, config)
  }
  let injector: Injector
  try {
    injector = inject(Injector, THROW_IF_NOT_FOUND, InjectFlags.Default)
  } catch {
    throw forkErrorFn('The fork function can only be called synchronously within a component.')
  }

  const app = viewfly({
    ...c,
    root,
    context: injector,
    nativeRenderer: new DomRenderer(),
  })

  onUnmounted(() => {
    app.destroy()
  })
  return app
}

