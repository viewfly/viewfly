import { createApp } from '@viewfly/platform-browser';

describe('单组件渲染', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('div')
  })

  test('正常生成 DOM 结构', () => {
    function App() {
      return function () {
        return (<div>App</div>)
      }
    }
    createApp(<App/>, root)

    expect(root.innerHTML).toBe('<div>App</div>')
  })
})
