import { Provider } from '../di/_api'
import { Props, jsx } from './jsx-element'
import { withAnnotation } from './component'
import { watch } from '../reactive/watch'

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

  watch<Provider[]>(() => {
    return props.providers
  }, (newProvider, oldProvider) => {
    if (newProvider === oldProvider) {
      return
    }
    contextComponent = createContextComponent(newProvider)
  })
  return () => {
    return jsx(contextComponent, {
      children: props.children
    })
  }
}
