import { withMark } from '@viewfly/core'

import css from './links.scoped.scss'

export const Links = withMark(css, function Links() {
  return () => {
    return (
      <div class="links">
        <a href="https://viewfly.org">官方网站</a>
        <a href="https://github.com/viewfly/viewfly">Github</a>
      </div>
    )
  }
})
