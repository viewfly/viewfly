import { Subject } from '@tanbo/stream'
import { NullInjector } from '@tanbo/di'

import { Component } from './component'
import { JSXInternal } from './types'

/**
 * Viewfly 根组件，用于实现组件状态更新事件通知
 */
export class RootComponent extends Component {
  changeEmitter = new Subject<void>()

  constructor(factory: JSXInternal.ElementClass, parentInjector = new NullInjector()) {
    super(parentInjector, factory, {})
  }

  override markAsChanged() {
    this._changed = true
    this.changeEmitter.next()
  }
}
