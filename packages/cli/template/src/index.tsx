import { createApp } from '@viewfly/platform-browser'

import './index.css'
import { Header } from './components/header/header'
import { Links } from './components/links/links'

function App() {
  return () => {
    return (
      <div class="app">
        <Header/>
        <main>
          <Links/>
        </main>
      </div>
    )
  }
}

createApp(<App/>).mount(document.getElementById('app')!)
