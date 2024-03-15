import { Container } from './container'
import { StyleProperties } from '../common/style'

export type EventHandlers<E> = {
  [K in keyof E]?: E[K] extends (...args: any) => any
    ? E[K]
    : (payload: E[K]) => void
}

export interface ClickEvent {
  target: Container
}

export interface Events {
  onClick: ClickEvent
}


export interface NodeAttributes<T> extends EventHandlers<Events>, JSXInternal.RefAttributes<T> {
  style?: Partial<StyleProperties>
}

export interface Elements {
  block: NodeAttributes<Container>
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSXInternal {
    export interface IntrinsicElements extends Elements {
    }
  }
}
