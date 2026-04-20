import { createApp } from '@viewfly/platform-browser'
import './style.css'

function App() {
  return () => {
    return (
      <main style={{ padding: '24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <h1>Viewfly + Vite</h1>
        <p>Project scaffolded successfully.</p>
      </main>
    )
  }
}

createApp(<App />).mount(document.getElementById('app')!)
