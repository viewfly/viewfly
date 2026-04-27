import { inject, onUnmounted, Props, reactive } from '@viewfly/core'

import { Navigator, QueryParams, Router } from './providers/_api'

export interface LinkProps extends Props {
  to: string
  active?: string
  exact?: boolean
  queryParams?: QueryParams
  fragment?: string
  tag?: string
  [key: string]: any
}

export function Link(props: LinkProps) {
  const navigator = inject(Navigator)
  const router = inject(Router)

  function normalizePathname(path: string) {
    const pathname = (path.split('#')[0].split('?')[0] || '/').replace(/\/+$/, '') || '/'
    const baseUrl = navigator.baseUrl === '/' || navigator.baseUrl === '' ? '' : navigator.baseUrl
    if (!baseUrl) {
      return pathname
    }
    const base = baseUrl.replace(/\/+$/, '') || '/'
    if (pathname === base) {
      return '/'
    }
    if (pathname.startsWith(base + '/')) {
      return pathname.substring(base.length)
    }
    return pathname
  }

  function getActive() {
    const currentPathname = normalizePathname(navigator.pathname)
    const targetPathname = normalizePathname(navigator.join(props.to, router))
    return props.exact ?
      currentPathname === targetPathname :
      (currentPathname === targetPathname || currentPathname.startsWith(targetPathname + '/'))
  }

  const isActive = reactive({
    value: getActive()
  })

  const subscription = navigator.onUrlChanged.subscribe(() => {
    isActive.value = getActive()
  })

  onUnmounted(() => {
    subscription.unsubscribe()
  })

  function navigate(ev: Event) {
    if ((!props.tag || props.tag === 'a') && props.target === '_blank') {
      return
    }
    ev.preventDefault()
    router.navigateTo(props.to, props.queryParams, props.fragment)
  }

  return () => {
    const Tag = props.tag || 'a'
    const attrs: any = Object.assign({}, props, {
      onClick(ev: MouseEvent) {
        navigate(ev)
        props.onClick?.(ev)
      },
      ...props
    })

    if (Tag === 'a') {
      attrs.href = navigator.join(props.to, router, props.queryParams, props.fragment)
    }

    if (isActive.value && props.active) {
      attrs.class = [attrs.class, props.active]
    }

    return <Tag {...attrs}>{props.children}</Tag>
  }
}
