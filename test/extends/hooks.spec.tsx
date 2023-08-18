import { Application, onMounted } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { useProduce, useStaticRef } from '@viewfly/hooks'

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

describe('Hooks: useStaticRef', () => {
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

  test('默认值为 null', () => {
    function App() {
      const ref = useStaticRef<HTMLDivElement>()
      expect(ref.current).toBeNull()
      return () => (
        <div ref={ref}></div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })

  test('视图渲染后可获取到 DOM', () => {
    function App() {
      const ref = useStaticRef<HTMLDivElement>()
      onMounted(() => {
        expect(ref.current?.tagName).toBe('DIV')
      })
      return () => (
        <div ref={ref}></div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })

  test('绑定多个，只生效第一个', () => {
    function App() {
      const ref = useStaticRef<HTMLDivElement>()
      onMounted(() => {
        expect(ref.current?.tagName).toBe('P')
      })
      return () => (
        <div>
          <p ref={ref}></p>
          <div ref={ref}></div>
        </div>
      )
    }

    app = createApp(<App/>, false).mount(root)
  })
})
