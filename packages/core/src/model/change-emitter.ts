import { Observable, Subject } from '@tanbo/stream'
import { Injectable } from '@tanbo/di'

import { Component } from './component'

@Injectable()
export class ChangeEmitter {
  onComponentChanged: Observable<Component>
  private componentChangedEvent = new Subject<Component>()

  constructor() {
    this.onComponentChanged = this.componentChangedEvent.asObservable()
  }

  push(component: Component) {
    this.componentChangedEvent.next(component)
  }
}
