import { HostRef, Viewfly } from '@viewfly/core'

describe('Core', () => {
  test('没有实现平台渲染器时报错', () => {
    const viewfly = new Viewfly({
      root: <div>test</div>
    })

    expect(() => {
      viewfly.mount(document.createElement('div'))
    }).toThrow()
  })
  test('没有挂载节节点时报错', () => {
    const viewfly = new Viewfly({
      root: <div>test</div>
    })

    expect(() => {
      viewfly.get(HostRef)
    }).toThrow()
  })
})
