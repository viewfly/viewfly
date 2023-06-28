import { inject, JSXProps } from '@viewfly/core'
import { Navigator, QueryParams, Router } from './providers/_api'

interface LinkProps extends JSXProps {
  to: string

  queryParams?: QueryParams
  tag?: string
}

export function Link(props: LinkProps) {
  const navigator = inject(Navigator)
  const router = inject(Router)

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

    return <Tag {...attrs}>{props.children}</Tag>
  }
}
