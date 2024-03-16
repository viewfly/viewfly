import { createApp } from '@viewfly/platform-canvas'
import { createSignal } from '@viewfly/core'

function App() {
  const count = createSignal(0)

  function createColor() {
    const fn = function () {
      const s = Math.floor(Math.random() * 255).toString(16)
      if (s.length === 2) {
        return s
      }
      return '0' + s
    }

    return `#${fn()}${fn()}${fn()}`
  }

  setInterval(() => {
    count.set(count() + 1)
  }, 1000)
  return () => {
    return (
      <block style={{
        left: 0,
        top: 0,
        backgroundColor: '#cee3cb',
        color: createColor(),
        borderRadius: 80,
        overflow: 'hidden',
        borderStyle: 'dashed',
        borderWidth: 10,
        padding: 10,
        borderColor: '#f60',
      }}>
        <block style={{
          backgroundColor: '#0000ff',
          width: 100,
        }}>{count()}
        </block>
        <block style={{
          backgroundColor: '#ff0',
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: '#ff0003',
          borderRadius: 20,
          margin: [10, 0, 70, 0]
        }}>test
        </block>
        <block style={{
          backgroundColor: '#afe333',
          color: '#888',
          width: 100,
          height: 130
        }}>19922239866 周
          <block>fdsafdas</block>
        </block>
        <block>fdsfs</block>
      </block>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
