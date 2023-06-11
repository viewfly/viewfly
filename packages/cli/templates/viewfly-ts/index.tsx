import {createApp} from '@viewfly/platform-browser'

import { useSignal } from '@viewfly/core'
import './index.scss'

function App() {
  const number = useSignal(0)

  return () => {
    return (
      <div>
        <div>{number()}</div>
        <div>
          <button type="button" onClick={() => {
            number.set(number() + 1)
          }}>
            点我加 1
          </button>
        </div>
      </div>
    )
  }
}

createApp(document.getElementById('app')!, () => <App/>)
