import { Application } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { useProduce } from '@viewfly/hooks'

describe('Hooks: useProduce', () => {
  let root: HTMLElement
  let app: Application

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('支持复杂对象更新', () => {
    const [getState, update] = useProduce({
      name: '张三',
      age: 33
    })

    function App() {
      return () => {
        const state = getState()
        return (
          <div>
            <div>{state.name}</div>
            <div>{state.age}</div>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(root.innerHTML).toBe('<div><div>张三</div><div>33</div></div>')

    update(draft => {
      draft.name = '李四'
      draft.age = 22
    })

    app.render()
    expect(root.innerHTML).toBe('<div><div>李四</div><div>22</div></div>')
  })
})
