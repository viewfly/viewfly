import { inject, onDestroy, useSignal } from '@viewfly/core'
import { LinkConfig } from './interface'
import { RouterContext } from './providers/router-context'
import { Navigator } from './providers/navigator'

export function Link(config: LinkConfig) {
  const navigator = inject(Navigator)
  const routerContext = inject(RouterContext)

  function getActive() {
    const pathname = navigator.location.pathname

    if(config.exact) {
      
    }
    return config.exact ?
      (pathname === navigator.resolveRelative(config.to, routerContext) ||
        (pathname + '/') === navigator.resolveRelative(config.to, routerContext)) :
      pathname.startsWith(navigator.resolveRelative(config.to, routerContext))
  }

  const isActive = useSignal(getActive())

  const subscription = navigator.onUrlChanged.subscribe(() => {
    isActive.set(getActive())
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  function navigate(ev: Event) {
    if ((!config.tag || config.tag === 'a') && config.target === '_blank') {
      return
    }

    ev.preventDefault()
    navigator.to(config.to, routerContext, config.searchParams)
  }

  return () => {
    const Tag = config.tag || 'a'
    const attrs: any = Object.assign({}, config, {
      onClick: navigate,
      ...config
    })

    if (Tag === 'a') {
      attrs.href = navigator.resolveRelative(config.to, routerContext, config.searchParams)
    }

    if (isActive() && config.active) {
      attrs.class = [attrs.class, config.active]
    }

    return <Tag {...attrs}>{config.children}</Tag>
  }
}
