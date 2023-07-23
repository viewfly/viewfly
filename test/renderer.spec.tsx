import { createApp, fork } from '@viewfly/platform-browser'
import { Renderer, useRef, useSignal, Viewfly, withMemo } from '@viewfly/core'
import { sleep } from './utils'

describe('单组件渲染', () => {
  let root: HTMLElement
  let app: Viewfly

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('正常生成 DOM 结构', () => {
    function App() {
      return function () {
        return (<div>App</div>)
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('<div>App</div>')
  })

  test('支持返回 null', () => {
    function App() {
      return () => null
    }

    app = createApp(root, <App/>)
    expect(root.innerHTML).toBe('')
  })

  test('多级嵌套， 依赖变更，自动触发异步渲染', async () => {
    function Header() {
      return () => {
        return (
          <div>header</div>
        )
      }
    }

    const count = useSignal(0)

    function Content() {
      return () => {
        return (
          <div>xxx{count()}</div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <>
            <Header/>
            <Content/>
          </>
        )
      }
    }

    app = createApp(root, <App/>)
    expect(root.innerHTML).toBe('<div>header</div><div>xxx0</div>')
    count.set(1)
    await sleep(1)
    expect(root.innerHTML).toBe('<div>header</div><div>xxx1</div>')
    count.set(2)
    await sleep(1)
    expect(root.innerHTML).toBe('<div>header</div><div>xxx2</div>')
  })

  test('支持返回 Fragment', () => {
    function App() {
      return () => {
        return (
          <>
            text!
          </>
        )
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('text!')
  })
  test('支持返回 Fragment 内包含多个节点', () => {
    function App() {
      return () => {
        return (
          <>
            <p>1</p>
            <p>2</p>
          </>
        )
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('<p>1</p><p>2</p>')
  })
  test('支持返回 Fragment 内包含单个节点', () => {
    function App() {
      return () => {
        return (
          <>
            <p>1</p>
          </>
        )
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('<p>1</p>')
  })

  test('支持在模板中嵌套 Fragment', () => {
    function App() {
      return function () {
        return (
          <div>
            <div>App</div>
            <>
              <p>hello</p>
              <p>viewfly</p>
            </>
          </div>
        )
      }
    }

    app = createApp(root, <App/>)

    expect(root.innerHTML).toBe('<div><div>App</div><p>hello</p><p>viewfly</p></div>')
  })

  test('支持数据 map 返回', () => {
    function App() {
      return () => {
        return (
          <div>
            <div>000</div>
            {
              Array.from({ length: 2 }).map(() => {
                return (
                  <div>
                  </div>
                )
              })
            }
            <div>
              111
            </div>
          </div>
        )
      }
    }

    app = createApp(root, <App/>)
    expect(root.innerHTML).toBe('<div><div>000</div><div></div><div></div><div>111</div></div>')
  })

  test('支持数据 map 返回 Fragment', () => {
    function App() {
      return () => {
        return (
          <div>
            <div>000</div>
            {
              Array.from({ length: 2 }).map(() => {
                return (
                  <>
                    <div>1</div>
                    <p>2</p>
                  </>
                )
              })
            }
            <div>
              111
            </div>
          </div>
        )
      }
    }

    app = createApp(root, <App/>)
    expect(root.innerHTML).toBe('<div><div>000</div><div>1</div><p>2</p><div>1</div><p>2</p><div>111</div></div>')
  })

  test('属性的增加与删除', () => {
    function App() {
      const isAdd = useSignal(true)
      return function () {
        return (
          <div onClick={() => {
            isAdd.set(!isAdd())
          }}>
            {
              isAdd() ? <p data-id="test" class="box">xxx</p> : <p>xxx</p>
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>)
    expect(root.innerHTML).toBe('<div><p data-id="test" class="box">xxx</p></div>')

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><p class="">xxx</p></div>')

    root.querySelector('div')!.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><p class="box" data-id="test">xxx</p></div>')
  })

  test('事件的增加与删除', () => {
    let clickSize = 0

    function App() {
      const isAdd = useSignal(true)

      function click() {
        clickSize++
      }

      return function () {
        return (
          <div>
            {
              isAdd() ? <p onClick={click}/> : <p/>
            }
            <button onClick={() => {
              isAdd.set(!isAdd())
            }}></button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(clickSize).toBe(0)
    const btn = root.querySelector('button')!

    const p = root.querySelector('p')!
    p.click()
    expect(clickSize).toBe(1)

    btn.click()
    app.get(Renderer).refresh()
    p.click()
    expect(clickSize).toBe(1)

    btn.click()
    app.get(Renderer).refresh()
    p.click()
    expect(clickSize).toBe(2)
  })

  test('表单 boolean 属性支持', () => {
    function App() {
      const bool = useSignal(false)
      return () => {
        return (
          <>
            <div>
              <input type="text" disabled={bool()} readonly={bool()}/>
              <button type="button" disabled={bool()}/>
              <select disabled={bool()} multiple={bool()}>
                <option value="1">1</option>
              </select>
            </div>
            <button class="btn" onClick={() => {
              bool.set(!bool())
            }}></button>
          </>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const input = root.querySelector('div input')! as HTMLInputElement
    const button = root.querySelector('div button')! as HTMLButtonElement
    const select = root.querySelector('div select')! as HTMLButtonElement

    const btn = root.querySelector('.btn') as HTMLButtonElement

    expect(input.disabled).toBeFalsy()
    expect((input as any).readonly).toBeFalsy()
    expect(button.disabled).toBeFalsy()
    expect(select.disabled).toBeFalsy()
    expect((select as any).multiple).toBeFalsy()

    btn.click()
    app.get(Renderer).refresh()

    expect(input.disabled).toBeTruthy()
    expect((input as any).readonly).toBeTruthy()
    expect(button.disabled).toBeTruthy()
    expect(select.disabled).toBeTruthy()
    expect((select as any).multiple).toBeTruthy()
  })

  test('支持 svg 标签渲染', () => {
    function App() {
      return function () {
        return (
          <svg xmlns="http://www.w3.org/2000/svg" version="1.1">
            <circle cx="100" cy="50" r="40" stroke="black" stroke-width="2" fill="red"/>
          </svg>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<svg xmlns="http://www.w3.org/2000/svg" version="1.1">' +
      '<circle cx="100" cy="50" r="40" stroke="black" stroke-width="2" fill="red"></circle></svg>')
  })

  test('支持 svg 标签更新', () => {
    function App() {
      const cy = useSignal(50)
      return function () {
        return (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1">
              <circle cx="100" cy={cy()} r="40" stroke="black" stroke-width="2" fill="red"/>
              <textPath xlinkHref={cy() === 50 ? '#a1' : '#a2'}>xxx</textPath>
            </svg>
            <button onClick={() => {
              cy.set(100)
            }}></button>
          </>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<svg xmlns="http://www.w3.org/2000/svg" version="1.1">' +
      '<circle cx="100" cy="50" r="40" stroke="black" stroke-width="2" fill="red"></circle><textPath xlink:href="#a1">xxx</textPath></svg><button></button>')
    root.querySelector('button')!.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<svg xmlns="http://www.w3.org/2000/svg" version="1.1">' +
      '<circle cx="100" cy="100" r="40" stroke="black" stroke-width="2" fill="red"></circle><textPath xlink:href="#a2">xxx</textPath></svg><button></button>')
  })

  test('可删除 svg 标签属性', () => {
    const attrs = useSignal<any>({
      'xlink:href': '#a'
    })

    function App() {
      return function () {
        return (
          <textPath {...attrs()}>xxx</textPath>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<textPath xlink:href="#a">xxx</textPath>')
    attrs.set(null)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<textPath>xxx</textPath>')
  })

  test('可删除 bool 属性和其它属性', () => {
    const attrs = useSignal<any>({
      disabled: true,
      type: 'text',
      value: '2'
    })

    function App() {
      return function () {
        return (
          <input {...attrs()}/>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<input disabled="" type="text" value="2">')
    attrs.set(null)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<input>')
  })

  test('支持在中间插入节点', () => {
    function App() {
      const isShow = useSignal(false)
      return function () {
        return (
          <div>
            <div>App</div>
            {isShow() ? <nav>hello</nav> : null}
            <p>viewfly</p>
            <button onClick={() => {
              isShow.set(!isShow())
            }
            }></button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const btn = root.querySelector('button')!

    expect(root.innerHTML).toBe('<div><div>App</div><p>viewfly</p><button></button></div>')

    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><div>App</div><nav>hello</nav><p>viewfly</p><button></button></div>')

    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><div>App</div><p>viewfly</p><button></button></div>')
  })

  test('同步 input value', () => {
    const name = useSignal('text')

    function App() {
      const ref = useRef<HTMLInputElement>(input => {
        input.value = 'xxxx'
      })
      return () => {
        return <input ref={ref} type="text" value={name()}/>
      }
    }

    app = createApp(root, <App/>, false)
    const input = root.querySelector('input')!
    expect(input.value).toBe('xxxx')

    name.set('0000')
    app.get(Renderer).refresh()

    expect(input.value).toBe('0000')
  })
})

describe('事件绑定', () => {
  let root: HTMLElement
  let app: Viewfly

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('可以绑定事件', () => {
    const eventCallback = jest.fn()

    function App() {
      return function () {
        return (<div onClick={eventCallback}>App</div>)
      }
    }

    app = createApp(root, <App/>, false)
    root.querySelector('div')!.click()

    expect(eventCallback).toBeCalled()
  })


  test('重新渲染后，事件不会重复绑定', () => {
    let i = 0

    function App() {
      const count = useSignal(0)

      function update() {
        i++
        count.set(count() + 1)
      }

      return function () {
        return (
          <div>
            <p>{count()}</p>
            <button onClick={update}>btn</button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const btn = root.querySelector('button')!
    btn.click()
    btn.click()
    app.get(Renderer).refresh()
    expect(root.querySelector('p')!.innerHTML).toBe('2')
    expect(i).toBe(2)
  })

  test('支持数组渲染', () => {
    function App() {
      const count = useSignal(1)
      return () => {
        return (
          <div onClick={() => {
            count.set(count() + 1)
          }}>
            {
              Array.from({ length: count() }).map((value, index) => {
                return (
                  <p>{index}</p>
                )
              })
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const div = root.querySelector('div')!

    expect(root.innerHTML).toBe('<div><p>0</p></div>')

    div.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><p>0</p><p>1</p></div>')
  })

  test('支持数组渲染返回 Fragment', () => {
    function App() {
      const count = useSignal(1)
      return () => {
        return (
          <div onClick={() => {
            count.set(count() + 1)
          }}>
            {
              Array.from({ length: count() }).map((value, index) => {
                return (
                  <>
                    <p>{index}</p>
                    <a>{index}</a>
                  </>
                )
              })
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const div = root.querySelector('div')!

    expect(root.innerHTML).toBe('<div><p>0</p><a>0</a></div>')

    div.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><p>0</p><a>0</a><p>1</p><a>1</a></div>')
  })

  test('意外的事件绑定', () => {
    function App() {
      return () => {
        // @ts-ignore
        return <div onClick="xxx"></div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div></div>')
  })

  test('空的 class 绑定', () => {
    function App() {
      return () => {
        return <div class=""></div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div></div>')
  })
  test('意外的 class 绑定', () => {
    function test() {
    }

    function App() {
      return () => {
        // @ts-ignore
        return <div class={test}></div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div></div>')
  })
})

describe('属性传递', () => {
  let root: HTMLElement
  let app: Viewfly

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('确保一定有 props 代理对象', () => {
    let type: string

    function Button(props) {
      return function () {
        type = props.type
        return (
          <button type={props.type}></button>
        )
      }
    }

    function App() {
      const is = useSignal(false)
      return function () {
        return (
          <div>
            {
              is() ? <Button type="button"/> : <Button/>
            }
            <p onClick={() => {
              is.set(!is())
            }}></p>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(type!).toBeUndefined()

    root.querySelector('p')!.click()
    app.get(Renderer).refresh()
    expect(type!).toBe('button')

  })

  test('可以通过 props 获取上层组件的数据', () => {
    function Button(props) {
      return function () {
        return (
          <button type={props.type}></button>
        )
      }
    }

    function App() {
      return function () {
        return (
          <div>
            <Button type="button"/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.querySelector('button')!.type).toBe('button')
  })

  test('props 可以通过解构拿到数据', () => {
    let config: any = {}

    function Button(props) {
      config = {
        ...props
      }
      return function () {
        return (
          <button type={props.type}></button>
        )
      }
    }

    function App() {
      return function () {
        return (
          <div>
            <Button type="button"/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div><button type="button"></button></div>')

    expect(config.type).toBe('button')
  })

  test('props 可以通过解构拿到数据', () => {
    let config: any = {}

    function Button(props) {
      config = {
        ...props
      }
      return function () {
        return (
          <button type={props.type}></button>
        )
      }
    }

    function App() {
      return function () {
        return (
          <div>
            <Button/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div><button type="undefined"></button></div>')

    expect(config.type).toBeUndefined()
  })

  test('可以接收到 props 变更', () => {
    function Input(props) {
      return function () {
        return (
          <input type={props.type}/>
        )
      }
    }

    function App() {
      const type = useSignal('text')
      return function () {
        return (
          <div>
            <Input type={type()}/>
            <button onClick={() => {
              type.set('number')
            }}></button>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    const input = root.querySelector('input')!
    const btn = root.querySelector('button')!

    expect(input.type).toBe('text')

    btn.click()
    app.get(Renderer).refresh()
    expect(input.type).toBe('number')
  })

  test('修改 props 会引发错误', () => {
    function Input(props) {
      props.type = 'number'
      return function () {
        return (
          <input type={props.type}/>
        )
      }
    }

    function App() {
      return function () {
        return (
          <div>
            <Input type='text'/>
          </div>
        )
      }
    }

    expect(() => createApp(root, <App/>, false)).toThrow()
  })
  test('在渲染时修改 props 会引发错误', () => {
    function Input(props) {
      return function () {
        props.type = 'number'
        return (
          <input type={props.type}/>
        )
      }
    }

    function App() {
      return function () {
        return (
          <div>
            <Input type='text'/>
          </div>
        )
      }
    }

    expect(() => createApp(root, <App/>, false)).toThrow()
  })

  test('可根据条件增删节点', () => {
    function App() {
      const isShow = useSignal(false)
      return function () {
        return (
          <div>
            <button onClick={() => {
              isShow.set(!isShow())
            }
            }>test
            </button>
            {
              isShow() && <p>test</p>
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const btn = root.querySelector('button')!
    expect(root.innerHTML).toBe('<div><button>test</button>false</div>')
    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button><p>test</p></div>')

    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button>false</div>')
  })


  test('可根据条件增删组件', () => {
    function Child() {
      return () => {
        return (
          <p>test</p>
        )
      }
    }

    function App() {
      const isShow = useSignal(false)
      return function () {
        return (
          <div>
            <button onClick={() => {
              isShow.set(!isShow())
            }
            }>test
            </button>
            {
              isShow() && <Child/>
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const btn = root.querySelector('button')!
    expect(root.innerHTML).toBe('<div><button>test</button>false</div>')
    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button><p>test</p></div>')

    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button>false</div>')
  })

  test('可根据条件复用节点', () => {
    function App() {
      const isShow = useSignal(false)
      return function () {
        return (
          <div>
            <button onClick={() => {
              isShow.set(!isShow())
            }
            }>test
            </button>
            {
              isShow() ? <p data-type="p1">111</p> : <p>222</p>
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const p = root.querySelector('p')
    const btn = root.querySelector('button')!
    expect(root.innerHTML).toBe('<div><button>test</button><p>222</p></div>')

    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button><p data-type="p1">111</p></div>')
    expect(root.querySelector('p')).toStrictEqual(p)

    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button><p>222</p></div>')
    expect(root.querySelector('p')).toStrictEqual(p)
  })

  test('空组件不影响渲染结果', () => {
    function Child() {
      return () => {
        return null
      }
    }

    function App() {
      const isShow = useSignal(false)
      return function () {
        return (
          <div>
            <button onClick={() => {
              isShow.set(!isShow())
            }
            }>test
            </button>
            {
              isShow() && <Child/>
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const btn = root.querySelector('button')!
    expect(root.innerHTML).toBe('<div><button>test</button>false</div>')
    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button></div>')

    btn.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><button>test</button>false</div>')
  })
})

describe('class 解析及渲染', () => {
  let root: HTMLElement
  let app: Viewfly

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('支持普通字符串', () => {
    function App() {
      return function () {
        return (
          <div class="box"></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.className).toBe('box')
  })
  test('空白字符原样渲染', () => {
    function App() {
      return function () {
        return (
          <div class=" "></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div class=" "></div>')
  })
  test('支持多个值', () => {
    function App() {
      return function () {
        return (
          <div class="box box1"></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.classList.contains('box')).toBeTruthy()
    expect(root.querySelector('div')!.classList.contains('box1')).toBeTruthy()
  })

  test('相同值原样渲染', () => {
    function App() {
      return function () {
        return (
          <div class="box box"></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.className).toBe('box box')
  })

  test('支持数组', () => {
    function App() {
      return function () {
        return (
          <div class={['box', 'box1']}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.classList.contains('box')).toBeTruthy()
    expect(root.querySelector('div')!.classList.contains('box1')).toBeTruthy()
  })
  test('支持对象', () => {
    function App() {
      return function () {
        return (
          <div class={{
            box: false,
            box1: true
          }}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.classList.contains('box')).toBeFalsy()
    expect(root.querySelector('div')!.classList.contains('box1')).toBeTruthy()
  })

  test('支持数组中嵌套对象', () => {
    function App() {
      return function () {
        return (
          <div class={['box', {
            box1: true
          }]}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.classList.contains('box')).toBeTruthy()
    expect(root.querySelector('div')!.classList.contains('box1')).toBeTruthy()
  })

  test('支持数组中嵌套对象，并根据条件渲染', () => {
    function App() {
      return function () {
        return (
          <div class={['box', {
            box1: true,
            box2: false
          }]}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.classList.contains('box')).toBeTruthy()
    expect(root.querySelector('div')!.classList.contains('box1')).toBeTruthy()
    expect(root.querySelector('div')!.classList.contains('box2')).toBeFalsy()
  })


  test('条件变更，可正常删除或增加 class token', () => {
    function App() {
      const isBox1 = useSignal(true)
      return function () {
        return (
          <div class={['box', {
            box1: isBox1(),
            box2: !isBox1()
          }]} onClick={() => {
            isBox1.set(!isBox1())
          }
          }></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const div = root.querySelector('div')!
    expect(div.classList.contains('box')).toBeTruthy()
    expect(div.classList.contains('box1')).toBeTruthy()
    expect(div.classList.contains('box2')).toBeFalsy()
    div.click()
    app.get(Renderer).refresh()
    expect(div.classList.contains('box')).toBeTruthy()
    expect(div.classList.contains('box1')).toBeFalsy()
    expect(div.classList.contains('box2')).toBeTruthy()
  })

  test('支持非常规数据解析', () => {
    const obj = {
      toString() {
        return 'box'
      }
    }

    function App() {
      return function () {
        return (
          <div class={obj}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div class="box"></div>')
  })
})

describe('style 解析及渲染', () => {
  let root: HTMLElement
  let app: Viewfly

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })

  test('支持普通字符串', () => {
    function App() {
      return () => {
        return (
          <div style="width: 20px; height: 40px"></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    const div = root.querySelector('div')!
    expect(div.style.width).toBe('20px')
    expect(div.style.height).toBe('40px')
  })

  test('忽略空白字符', () => {
    function App() {
      return () => {
        return (
          <div style=" "></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div></div>')
  })

  test('忽略没有值的错误', () => {
    function App() {
      return () => {
        return (
          <div style="width:; "></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div></div>')
  })
  test('忽略没有 key 的错误', () => {
    function App() {
      return () => {
        return (
          <div style=":20px; "></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    expect(root.innerHTML).toBe('<div></div>')
  })

  test('支持对象', () => {
    function App() {
      return () => {
        return (
          <div style={{
            width: '20px',
            height: '40px'
          }}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    const div = root.querySelector('div')!
    expect(div.style.width).toBe('20px')
    expect(div.style.height).toBe('40px')
  })

  test('支持忽略空值', () => {
    function App() {
      return () => {
        return (
          <div style={{
            width: '20px',
            height: '40px',
            color: undefined
          }}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div style="width: 20px; height: 40px;"></div>')
  })

  test('支持整体更新', () => {
    function App() {
      const isAdd = useSignal(true)
      return () => {
        return (
          <div style={isAdd() ? {
            width: '20px',
            height: '40px'
          } : null} onClick={() => {
            isAdd.set(!isAdd())
          }}></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    const div = root.querySelector('div')!
    expect(div.style.width).toBe('20px')
    expect(div.style.height).toBe('40px')

    div.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div style=""></div>')

    div.click()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div style="width: 20px; height: 40px;"></div>')
  })

  test('数据变更可更新', () => {
    function App() {
      const isMin = useSignal(true)
      return () => {
        return (
          <div style={{
            width: '20px',
            height: isMin() ? '40px' : '80px'
          }} onClick={() => {
            isMin.set(!isMin())
          }
          }></div>
        )
      }
    }

    app = createApp(root, <App/>, false)

    const div = root.querySelector('div')!
    expect(div.style.width).toBe('20px')
    expect(div.style.height).toBe('40px')
    div.click()
    app.get(Renderer).refresh()

    expect(div.style.width).toBe('20px')
    expect(div.style.height).toBe('80px')
  })
})

describe('组件切换', () => {
  let root: HTMLElement
  let app: Viewfly

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
  })
  test('同组件切换', () => {
    function Child(props: any) {
      return () => {
        return (
          <div>
            <div>{props.name}</div>
            <div>{props.value}</div>
          </div>
        )
      }
    }

    const config = {
      a: <Child name="aaa" value="aaa-value"/>,
      b: <Child name="bbb" value="bbb-value"/>
    }

    function App() {
      const child = useSignal(config.a)

      return () => {
        return (
          <div>
            <div>
              <button class="btn1" onClick={() => {
                child.set(config.a)
              }}>toA
              </button>
              <button class="btn2" onClick={() => {
                child.set(config.b)
              }}>toB
              </button>
            </div>
            <div class="content">{
              child()
            }</div>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const content = root.querySelector('.content')!
    const btn1 = root.querySelector('.btn1')! as HTMLButtonElement
    const btn2 = root.querySelector('.btn2')! as HTMLButtonElement
    expect(content.innerHTML).toBe('<div><div>aaa</div><div>aaa-value</div></div>')

    btn2.click()
    app.get(Renderer).refresh()
    expect(content.innerHTML).toBe('<div><div>bbb</div><div>bbb-value</div></div>')

    btn1.click()
    app.get(Renderer).refresh()
    expect(content.innerHTML).toBe('<div><div>aaa</div><div>aaa-value</div></div>')
  })
  test('组件清空', () => {
    const isShow = useSignal(true)

    function Child() {
      return () => {
        return (
          isShow() ? <div>child</div> : null
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            {isShow()}
            <Child/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div>true<div>child</div></div>')

    isShow.set(false)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>false</div>')
  })
})

describe('创建脱离模态框', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('在组件外调用会抛出异常', () => {
    expect(() => {
      const modalContent = <div>modal</div>
      fork(modalContent)
    }).toThrow()
  })
  test('可在组件内动态创建和销毁', () => {
    const modalHost = document.createElement('div')

    function Child() {
      const modalContent = <div>modal</div>
      const childApp = fork(modalContent)
      childApp.mount(modalHost)

      return () => {
        return (
          <p>child</p>
        )
      }
    }

    const isShow = useSignal(true)

    function App() {

      return () => {
        return (
          <div>
            {
              isShow() ? <Child/> : null
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div><p>child</p></div>')
    expect(modalHost.innerHTML).toBe('<div>modal</div>')

    isShow.set(false)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div></div>')
    expect(modalHost.innerHTML).toBe('')
  })
})

describe('diff 跳出时，正确还原', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('当前一个组件未变更时', () => {
    function Header() {
      return () => {
        return (
          <div>header</div>
        )
      }
    }

    const count = useSignal(0)

    function Content() {
      return () => {
        return (
          <div>xxx{count()}</div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <>
            <Header/>
            <Content/>
          </>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div>header</div><div>xxx0</div>')

    count.set(1)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>header</div><div>xxx1</div>')
    count.set(2)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>header</div><div>xxx2</div>')
  })

  test('当前一个组件为空时', () => {
    function Header() {
      return () => {
        return null
      }
    }

    const count = useSignal(0)

    function Content() {
      return () => {
        return (
          <div>xxx{count()}</div>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            <Header/>
            <Content/>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div><div>xxx0</div></div>')

    count.set(1)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><div>xxx1</div></div>')
  })

  test('可正常清理节点', () => {
    const arr = useSignal([1, 2, 3, 4])

    function App() {
      return () => {
        return (
          <div>
            {
              arr().map(i => {
                return <p>{i}</p>
              })
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div><p>1</p><p>2</p><p>3</p><p>4</p></div>')
    arr.set([])
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div></div>')
  })
})

describe('key 复用', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('相同 key 元素交换', () => {
    const arr = Array.from({ length: 5 }).map((_, index) => {
      return {
        label: index,
        id: 'id' + index
      }
    })

    const rows = useSignal(arr)

    function App() {
      return () => {
        return (
          <ul>
            {
              rows().map(item => {
                return (
                  <li key={item.id}>{item.label}</li>
                )
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const li = root.querySelectorAll('li')[1]
    li.classList.add('test')

    const li1 = arr[1]
    const li3 = arr[3]

    arr[1] = li3
    arr[3] = li1

    rows.set(arr.slice())

    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<ul><li>0</li><li>3</li><li>2</li><li class="test">1</li><li>4</li></ul>')
  })

  test('相同 key 组件交换', () => {
    const arr = Array.from({ length: 5 }).map((_, index) => {
      return {
        label: index,
        id: 'id' + index
      }
    })

    const rows = useSignal(arr)

    function ListItem(props) {
      return () => {
        return (
          <li>{props.children}</li>
        )
      }
    }

    function App() {
      return () => {
        return (
          <ul>
            {
              rows().map(item => {
                return (
                  <ListItem key={item.id}>{item.label}</ListItem>
                )
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const li = root.querySelectorAll('li')[1]
    li.classList.add('test')

    const li1 = arr[1]
    const li3 = arr[3]

    arr[1] = li3
    arr[3] = li1

    rows.set(arr.slice())

    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<ul><li>0</li><li>3</li><li>2</li><li class="test">1</li><li>4</li></ul>')
  })

  test('相同 key 组件交换并清理子组件', () => {
    const arr = Array.from({ length: 5 }).map((_, index) => {
      return {
        label: index,
        id: 'id' + index
      }
    })

    const rows = useSignal(arr)

    function Box() {
      return () => {
        return (
          <div>test</div>
        )
      }
    }

    function ListItem(props) {
      return () => {
        return (
          <>
            <p>{props.children}</p>
            <Box/>
          </>
        )
      }
    }

    function App() {
      return () => {
        return (
          <div>
            {
              rows().map(item => {
                return (
                  <ListItem key={item.id}>{item.label}</ListItem>
                )
              })
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    const p = root.querySelectorAll('p')[1]
    p.classList.add('test')

    const li1 = arr[1]
    const li3 = arr[3]

    arr[1] = li3
    arr[3] = li1

    rows.set(arr.slice())

    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><p>0</p><div>test</div><p>3</p><div>test</div><p>2</p><div>test</div><p class="test">1</p><div>test</div><p>4</p><div>test</div></div>')
  })
})

describe('key 变更策略验证', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('删除首行', () => {
    const list = useSignal(['id1', 'id2', 'id3'])

    function App() {
      return () => {
        return (
          <ul>
            {
              list().map(item => {
                return (
                  <li key={item}>{item}</li>
                )
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<ul><li>id1</li><li>id2</li><li>id3</li></ul>')
    const oldList = root.querySelectorAll('li')
    list.set(list().slice(1))
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<ul><li>id2</li><li>id3</li></ul>')
    const newList = root.querySelectorAll('li')
    expect(oldList[1]).toStrictEqual(newList[0])
    expect(oldList[2]).toStrictEqual(newList[1])
  })

  test('插入首行', () => {
    const list = useSignal(['id2', 'id3'])

    function App() {
      return () => {
        return (
          <ul>
            {
              list().map(item => {
                return (
                  <li key={item}>{item}</li>
                )
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<ul><li>id2</li><li>id3</li></ul>')
    const oldList = root.querySelectorAll('li')
    list().unshift('id1')
    list.set(list().slice())
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<ul><li>id1</li><li>id2</li><li>id3</li></ul>')
    const newList = root.querySelectorAll('li')
    expect(oldList[0]).toStrictEqual(newList[1])
    expect(oldList[1]).toStrictEqual(newList[2])
  })

  test('首尾交换', () => {
    const list = useSignal(['id1', 'id2', 'id3'])

    function App() {
      return () => {
        return (
          <ul>
            {
              list().map(item => {
                return (
                  <li key={item}>{item}</li>
                )
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<ul><li>id1</li><li>id2</li><li>id3</li></ul>')
    const oldList = root.querySelectorAll('li')
    const arr = list()
    const first = arr.shift()!
    const last = arr.pop()!
    arr.unshift(last)
    arr.push(first)
    list.set(arr.slice())
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<ul><li>id3</li><li>id2</li><li>id1</li></ul>')
    const newList = root.querySelectorAll('li')
    expect(oldList[0]).toStrictEqual(newList[2])
    expect(oldList[1]).toStrictEqual(newList[1])
    expect(oldList[2]).toStrictEqual(newList[0])
  })
})

describe('children 变更', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('有无切换', () => {
    const isShow = useSignal(true)
    const ref = useRef<HTMLDivElement>(() => {
    })

    function App() {
      return () => {
        return (
          <div>
            {
              isShow() ? <div ref={ref} style={{ width: '20px' }}>test</div> : <div/>
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div><div style="width: 20px;">test</div></div>')
    isShow.set(false)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><div style=""></div></div>')
    isShow.set(true)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div><div style="width: 20px;">test</div></div>')
  })
})

describe('依赖收集验证', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('不影响视图的变更，不会引起重复渲染', () => {
    const isShow = useSignal(true)
    const value1 = useSignal('a')
    const value2 = useSignal(1)
    const fn = jest.fn()

    function App() {
      return () => {
        fn()
        return (
          <div>
            {
              isShow() ? value1() : value2()
            }
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div>a</div>')
    expect(fn).toHaveBeenCalledTimes(1)

    value2.set(2)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>a</div>')
    expect(fn).toHaveBeenCalledTimes(1)

    isShow.set(false)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>2</div>')
    expect(fn).toHaveBeenCalledTimes(2)

    value1.set('b')
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>2</div>')
    expect(fn).toHaveBeenCalledTimes(2)

    value2.set(3)
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>3</div>')
    expect(fn).toHaveBeenCalledTimes(3)
  })
})

describe('Memo', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('当返回 false 时，跳过更新', () => {
    const fn = jest.fn()

    function List(props) {
      return withMemo((currentProps, prevProps) => {
        return currentProps.value !== prevProps.value
      }, () => {
        fn()
        return (
          <li>{props.value}</li>
        )
      })
    }

    const list = useSignal([1, 2])

    function App() {
      return () => {
        return (
          <ul>
            {
              list().map(v => {
                return <List value={v}/>
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toHaveBeenCalledTimes(2)
    list.set([...list(), 3])
    app.get(Renderer).refresh()

    expect(fn).toHaveBeenCalledTimes(3)
  })

  test('可以从中间更新', () => {
    const fn = jest.fn()

    function List(props) {
      return withMemo((currentProps, prevProps) => {
        return currentProps.value !== prevProps.value
      }, () => {
        fn()
        return (
          <li>{props.value}</li>
        )
      })
    }

    const list = useSignal([1, 2])

    function App() {
      return () => {
        return (
          <ul>
            {
              list().map(v => {
                return <List key={v} value={v}/>
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toHaveBeenCalledTimes(2)
    list.set([1, 3, 2])
    app.get(Renderer).refresh()

    expect(fn).toHaveBeenCalledTimes(3)
    expect(root.innerHTML).toBe('<ul><li>1</li><li>3</li><li>2</li></ul>')
  })

  test('可以迁移组件 DOM', () => {
    const fn = jest.fn()

    function Detail(props) {
      return () => {
        return (
          <>
            <li>{props.value}</li>
            <li>{props.value}{props.value}</li>
          </>
        )
      }
    }

    function List(props) {
      return withMemo((currentProps, prevProps) => {
        return currentProps.value !== prevProps.value
      }, () => {
        fn()
        return <Detail value={props.value}/>
      })
    }

    const list = useSignal([1, 2])

    function App() {
      return () => {
        return (
          <ul>
            {
              list().map(v => {
                return <List key={v} value={v}/>
              })
            }
          </ul>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(fn).toHaveBeenCalledTimes(2)
    expect(root.innerHTML).toBe('<ul><li>1</li><li>11</li><li>2</li><li>22</li></ul>')
    list.set([2, 3, 1])
    app.get(Renderer).refresh()

    expect(fn).toHaveBeenCalledTimes(3)
    expect(root.innerHTML).toBe('<ul><li>2</li><li>22</li><li>3</li><li>33</li><li>1</li><li>11</li></ul>')
  })
})

describe('组件 Ref', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })

  test('可以获取到实例', () => {
    function Child() {
      return {
        show() {
        },
        $render() {
          return <div>child</div>
        }
      }
    }

    const ref = useRef<typeof Child>(e => {
      expect(typeof e.show === 'function').toBeTruthy()
    })

    function App() {
      return () => {
        return <Child ref={ref}/>
      }
    }

    app = createApp(root, <App/>, false)
  })

  test('可以绑定多个 Ref', () => {
    function Child() {
      return {
        show() {
        },
        $render() {
          return <div>child</div>
        }
      }
    }

    const ref = useRef<typeof Child>(e => {
      expect(typeof e.show === 'function').toBeTruthy()
    })

    const ref2 = useRef<typeof Child>(e => {
      expect(typeof e.show === 'function').toBeTruthy()
    })

    function App() {
      return () => {
        return <Child ref={[ref, ref2]}/>
      }
    }

    app = createApp(root, <App/>, false)
  })

  test('ref 可切换', () => {
    function Child() {
      return {
        show() {
        },
        $render() {
          return <div>child</div>
        }
      }
    }

    const bind1 = jest.fn()
    const bind2 = jest.fn()

    const unbind1 = jest.fn()
    const unbind2 = jest.fn()
    const ref1 = useRef<typeof Child>(e => {
      bind1()
      return unbind1
    })

    const ref2 = useRef<typeof Child>(e => {
      bind2()
      return unbind2
    })

    const isLeft = useSignal(true)

    function App() {
      return () => {
        return <Child ref={isLeft() ? ref1 : ref2}/>
      }
    }

    app = createApp(root, <App/>, false)

    expect(bind1).toHaveBeenCalledTimes(1)
    expect(bind2).not.toBeCalled()

    isLeft.set(false)
    app.get(Renderer).refresh()
    expect(bind1).toHaveBeenCalledTimes(1)
    expect(bind2).toHaveBeenCalledTimes(1)

    expect(unbind1).toHaveBeenCalledTimes(1)
    expect(unbind2).not.toBeCalled()

    isLeft.set(true)
    app.get(Renderer).refresh()
    expect(bind1).toHaveBeenCalledTimes(2)
    expect(unbind1).toHaveBeenCalledTimes(1)
    expect(bind2).toHaveBeenCalledTimes(1)
    expect(unbind2).toHaveBeenCalledTimes(1)
  })
})

describe('组件复用', () => {
  let root: HTMLElement
  let app: Viewfly | null

  beforeEach(() => {
    root = document.createElement('div')
  })

  afterEach(() => {
    if (app) {
      app.destroy()
    }
    app = null
  })
  test('组件复用但内容变化', () => {
    const child = useSignal<string | null>(null)

    function switchChild() {
      child.set(child() ? null : 'test')
    }
    function App() {
      return () => {
        return (
          <div>
            <>
              {child()}
            </>
          </div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div></div>')

    switchChild()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div>test</div>')

    switchChild()
    app.get(Renderer).refresh()
    expect(root.innerHTML).toBe('<div></div>')
  })
})
