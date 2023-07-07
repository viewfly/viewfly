import { Link, RootRouter, RouterOutlet } from '@viewfly/router';
import { createApp } from '@viewfly/platform-browser';

function Child() {
  return () => {
    return (
      <p>
        <Link to='../../test'>test</Link>
      </p>
    )
  }
}
function Home() {
  return () => {
    return (
      <div>
        <RouterOutlet config={[
          {
            name: 'child',
            component: Child
          }
        ]}/>
      </div>
    )
  }
}
function App() {
  return () => {
    return (
      <div>
        <RootRouter>
          <RouterOutlet config={[
            {
              name: 'home',
              component: Home
            }
          ]}/>
        </RootRouter>
      </div>
    )
  }
}

createApp(document.getElementById('app')!, <App/>)
