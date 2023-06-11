import { Viewfly } from '@viewfly/core'

describe('Core', () => {
  test('没有实现平台渲染器时报错', () => {
    const viewfly = new Viewfly({
      host: document.createElement('div'),
      root: <div>test</div>
    })

    expect(() => {
      viewfly.start()
    }).toThrow()
  })
})
