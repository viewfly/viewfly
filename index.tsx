import { createApp } from '@viewfly/platform-canvas'
import { createSignal } from '@viewfly/core'

function App() {
  const count = createSignal(0)
  const str = createSignal('a')

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
    str.set(str() + count())
    count.set(count() + 1)
  }, 200)
  return () => {
    return (
      <block style={{
        left: 0,
        top: 0,
        backgroundColor: '#cee3cb',
        color: createColor(),
        borderRadius: 20,
        overflow: 'hidden',
        borderStyle: 'dashed',
        borderWidth: 1,
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
          margin: [10, 0, 10, 0]
        }}>test
        </block>
        <block style={{
          backgroundColor: '#afe333',
          color: '#fff',
        }}>19922239866 周
          <block style={{
            width: 200,
            backgroundColor: '#f80'
          }}>fdsaf魂牵梦萦魂牵fdsaf{str()}dasfdsafdsafs梦萦朝秦暮楚魂牵梦萦das</block>
        </block>
        <block>fdsfs</block>
      </block>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
