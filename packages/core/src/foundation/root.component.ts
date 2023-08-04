import { JSXInternal } from './types'
import { JSXComponent } from './jsx-element'
import { Component } from './component'

/**
 * Viewfly 根组件，用于实现组件状态更新事件通知
 */
export class RootComponent extends JSXComponent {
  onChange: (() => void) | null = null

  constructor(factory: JSXInternal.ComponentSetup, {}) {
    super(factory, {}, (parentComponent, jsxNode) => {
      return new Component(parentComponent, jsxNode, {})
    })
  }

  override markAsChanged(changedComponent?: JSXComponent) {
    this._changed = true
    if (changedComponent) {
      this.changedSubComponents.add(changedComponent)
    }
    this.onChange?.()
  }
}
