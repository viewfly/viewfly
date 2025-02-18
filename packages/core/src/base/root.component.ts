import { Component, ComponentSetup } from './component'

/**
 * Viewfly 根组件，用于实现组件状态更新事件通知
 */
export class RootComponent extends Component {
  constructor(factory: ComponentSetup, private refresh: () => void) {
    super(null, factory, {})
  }

  override markAsChanged(changedComponent?: Component) {
    this._changed = true
    if (changedComponent) {
      this.changedSubComponents.add(changedComponent)
    }
    this.refresh()
  }
}
