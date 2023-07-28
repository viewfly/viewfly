import { withScopedCSS } from '@viewfly/scoped-css'

import css from './links.scoped.scss'

export function Links() {
  return withScopedCSS(css, () => {
    return (
      <div class="links">
        <a href="https://viewfly.org">官方网站</a>
        <a href="https://github.com/viewfly/viewfly">Github</a>
      </div>
    )
  })
}
