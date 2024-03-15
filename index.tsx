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
        width: 300,
        height: 200,
        left: 0,
        top: 0,
        backgroundColor: '#cee3cb',
        color: createColor(),
        borderRadius: 20,
        overflow: 'hidden',
        borderStyle: 'dashed',
        borderWidth: 10,
        padding: 10,
        borderColor: '#000',
      }}>
        <block style={{
          backgroundColor: '#0000ff',
          width: 100,
          height: 30
        }}>{count()}
        </block>
        <block style={{
          backgroundColor: '#ff0',
          width: 100,
          height: 50,
          borderStyle: 'dashed',
          borderWidth: 2,
          borderColor: '#ff0003',
          borderRadius: 20
        }}>test
        </block>
        <block style={{
          backgroundColor: '#afe333',
          width: 100,
          height: 130
        }}>000
          <block>fdsafdas</block>
        </block>
        <block>fdsfs</block>
      </block>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
