import { createApp, fork } from '@viewfly/platform-browser'
import { Fragment, Renderer, useRef, useSignal, Viewfly } from '@viewfly/core'

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

  test('调用 Fragment 会抛出异常', () => {
    expect(() => {
      Fragment()
    }).toThrow()
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
              <textPath xlink:href={cy() === 50 ? '#a1' : '#a2'}>xxx</textPath>
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
        return <div onClick="xxx"></div>
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div onclick="xxx"></div>')
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
  test('空白字符无效', () => {
    function App() {
      return function () {
        return (
          <div class=" "></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.innerHTML).toBe('<div></div>')
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

  test('相同值自动去重', () => {
    function App() {
      return function () {
        return (
          <div class="box box"></div>
        )
      }
    }

    app = createApp(root, <App/>, false)
    expect(root.querySelector('div')!.className).toBe('box')
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
            color: null
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

describe('特殊场景', () => {
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
      fork(document.createElement('div'), modalContent)
    }).toThrow()
  })
  test('可在组件内动态创建和销毁', () => {
    const modalHost = document.createElement('div')

    function Child() {
      const modalContent = <div>modal</div>
      const childApp = fork(modalHost, modalContent)
      childApp.run()

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
