import { withScopedCSS } from '@viewfly/scoped-css'

import css from './header.scoped.scss'
import logo from './logo.svg'

export function Header() {
  return withScopedCSS(css, () => {
    return (
      <header>
        <div class="logo">
          <img src={logo} alt="logo"/>
        </div>
        <h1>Viewfly</h1>
        <p>简单、符合直觉的 JavaScript 框架</p>
      </header>
    )
  })
}
