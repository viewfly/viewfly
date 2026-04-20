import { createApp } from '@viewfly/platform-browser'

import './index.css'

function App() {
  return () => {
    return <div>test</div>
  }
}

createApp(<App />).mount(document.querySelector('#main')!)
