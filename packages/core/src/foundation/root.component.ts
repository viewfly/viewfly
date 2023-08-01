import { Component } from './component'
import { JSXInternal } from './types'
import { Injector } from '../di/_api'

/**
 * Viewfly 根组件，用于实现组件状态更新事件通知
 */
export class RootComponent extends Component {
  onChange: (() => void) | null = null

  constructor(factory: JSXInternal.ComponentConstructor, parentInjector: Injector) {
    super(parentInjector, factory, {})
  }

  override markAsChanged(changedComponent?: Component) {
    this._changed = true
    if (changedComponent) {
      this.changedSubComponents.add(changedComponent)
    }
    this.onChange?.()
  }
}
