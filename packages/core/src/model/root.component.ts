import { Subject } from '@tanbo/stream'

import { Component, ComponentFactory } from './component'
import { Props } from './jsx-element'

/**
 * Viewfly 根组件，用于实现组件状态更新事件通知
 */
export class RootComponent extends Component {
  changeEmitter = new Subject<void>()

  constructor(factory: ComponentFactory) {
    super(factory, new Props(null))
  }

  override markAsChanged() {
    this._changed = true
    this.changeEmitter.next()
  }
}
