import { Subject } from '@tanbo/stream'

import { Component, ComponentFactory } from './component'
import { Props } from './jsx-element'

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
