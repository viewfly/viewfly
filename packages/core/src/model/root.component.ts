import { Subject } from '@tanbo/stream'

import { Component } from './component'
import { ComponentFactory, Props } from './jsx-element'

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
