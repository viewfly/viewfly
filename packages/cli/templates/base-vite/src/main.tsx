import { createApp } from '@viewfly/platform-browser'
import './style.css'

function App() {
  return () => {
    return (
      <main class="welcome">
        <img class="welcome__logo" src="/logo.svg" alt="Viewfly" width="80" height="80" />
        <h1 class="welcome__title">Viewfly + Vite</h1>
        <p class="welcome__text">Project scaffolded successfully.</p>
        <p class="welcome__links">
          <a href="https://viewfly.org" target="_blank" rel="noreferrer">viewfly.org</a>
        </p>
      </main>
    )
  }
}

createApp(<App />).mount(document.getElementById('app')!)
