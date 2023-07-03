import { inject, onDestroy, Props, useSignal } from '@viewfly/core'

import { Navigator, QueryParams, Router } from './providers/_api'

export interface LinkProps extends Props {
  to: string
  active?: string
  exact?: boolean
  queryParams?: QueryParams
  tag?: string
}

export function Link(props: LinkProps) {
  const navigator = inject(Navigator)
  const router = inject(Router)

  function getActive() {
    return props.exact ?
      navigator.pathname === navigator.join(props.to, router) :
      navigator.pathname.startsWith(navigator.join(props.to, router))
  }

  const isActive = useSignal(getActive())

  const subscription = navigator.onUrlChanged.subscribe(() => {
    isActive.set(getActive())
  })

  onDestroy(() => {
    subscription.unsubscribe()
  })

  function navigate(ev: Event) {
    ev.preventDefault()
    router.navigateTo(props.to, props.queryParams)
  }

  return () => {
    const Tag = props.tag || 'a'
    const attrs: any = Object.assign({
      target: '_blank'
    }, props, {
      onClick: navigate,
      ...props
    })

    if (Tag === 'a') {
      attrs.href = navigator.join(props.to, router, props.queryParams)
    }

    if (isActive() && props.active) {
      if (!attrs.class) {
        attrs.class = props.active.toString()
      } else if (typeof attrs.class === 'string') {
        attrs.class += ' ' + props.active
      } else if (typeof props.active === 'object') {
        attrs.class[props.active] = true
      } else if (Array.isArray(attrs.class)) {
        attrs.class.push(props.active)
      }
    }

    return <Tag {...attrs}>{props.children}</Tag>
  }
}
