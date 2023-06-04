import { Subject } from '@tanbo/stream'

import { Component } from './component'
import { ComponentFactory, Props } from './jsx-element'

export class RootComponent extends Component {
  changeEmitter = new Subject<void>()

  constructor(factory: ComponentFactory,
              props: Props | null = null) {
    super(factory, props)
  }

  override markAsChanged() {
    this._changed = true
    this.changeEmitter.next()
  }
}
