import { inject, Props } from '@viewfly/core'

import { Navigator, QueryParams, Router } from './providers/_api'

export interface LinkProps extends Props {
  queryParams?: QueryParams
  to: string
  tag?: string
}

export function Link(props: LinkProps) {
  const navigator = inject(Navigator)
  const router = inject(Router)

  function to(ev) {
    router.navigateTo(props.to, props.queryParams)
    ev.preventDefault()
  }

  return () => {
    const Tag = props.tag || 'a'
    const attrs: any = Object.assign({
      target: '_blank'
    }, props, {
      onClick: to,
      ...props
    })
    if (Tag === 'a') {
      attrs.href = navigator.join(props.to, router, props.queryParams)
    }
    return <Tag {...attrs}>{props.children}</Tag>
  }
}
