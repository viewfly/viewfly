import { onPropsChanged } from './lifecycle'
import { Provider } from '../di/_api'
import { Props, jsx } from './jsx-element'
import { withAnnotation } from './component'

export interface ContextProps extends Props {
  providers: Provider[]
}

export function Context(props: ContextProps) {
  function createContextComponent(providers: Provider[]) {
    return withAnnotation({
      providers,
    }, (childProps: Props) => {
      return () => {
        return childProps.children
      }
    })
  }

  let contextComponent = createContextComponent(props.providers)

  onPropsChanged((newProps: ContextProps, oldProps) => {
    if (newProps.providers === oldProps.providers) {
      return
    }
    contextComponent = createContextComponent(newProps.providers)
  })
  return () => {
    return jsx(contextComponent, {
      children: props.children
    })
  }
}
