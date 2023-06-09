import { Observable, Subject } from '@tanbo/stream'
import {
  Component,
  Injectable,
  JSXElement,
  JSXText,
  inject,
  onDestroy,
  provide,
  useSignal
} from '@viewfly/core'

export type ViewflyNode = JSXElement | JSXText | Component | undefined

export interface RouteChangeEvent {
  pathname: string
}

@Injectable()
export class RouteContext {
  get pathname() {
    return this._pathname
  }

  set pathname(value: string) {
    this._pathname = value
  }

  onChange: Observable<void>

  private _changeEvent = new Subject<void>()
  private _pathname = ''

  constructor() {
    this.onChange = this._changeEvent.asObservable()
  }

  makeChange() {
    this._changeEvent.next()
  }
}

export function useRouteContext() {
  const currentContext = inject(RouteContext)
  const childContext = provide(RouteContext).get(RouteContext)

  return [currentContext, childContext]
}

export interface RouteProps {
  path: string
  component: ViewflyNode
}

export function Route(props: RouteProps) {
  const [context, childContext] = useRouteContext()
  const currentComponent = useSignal<ViewflyNode | null>(null)

  console.log('updateCurrentComponent: ', context.pathname)
  function updateCurrentComponent() {
    if (context.pathname.startsWith(props.path)) {
      childContext.pathname = context.pathname.slice(props.path.length - 1)
      currentComponent.set(props.component)
    } else {
      currentComponent.set(null)
    }
  }

  updateCurrentComponent()

  const subscription = context.onChange.subscribe(() => {
    updateCurrentComponent()
    childContext.makeChange()
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  return () => {
    return (
      <>
        {currentComponent()}
      </>
    )
  }
}