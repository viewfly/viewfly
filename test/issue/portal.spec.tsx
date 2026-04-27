import { Application, createDynamicRef, reactive, Portal } from '@viewfly/core'
import { createApp, DomRenderer } from '@viewfly/platform-browser'

describe('Portal（原 createPortal 场景）', () => {
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
  test('可正常清理子节点', () => {
    const portalContainer = document.createElement('div')

    function PopupContent() {
      return () => (
        <div>PopupContent</div>
      )
    }

    const model = reactive({ visible: false })

    function Popup() {
      function togglePopup() {
        model.visible = !model.visible
      }

      return () => {
        return (
          <>
            <button onClick={togglePopup} class="p-1 text-blue-500">toggle popup</button>
            {model.visible && (
              <Portal container={portalContainer}>
                <div class="absolute shadow-md inset-1/3 p-4 bg-gray-100" id="test">
                  <PopupContent/>
                </div>
              </Portal>
            )}
          </>
        )
      }
    }


    function PopupParent() {
      return () => {
        return (
          <div class="border border-gray-100">
            this is popup parent component.
            <Popup/>
          </div>
        )
      }
    }

    const model2 = reactive({
      showPopupParent: true
    })

    function PortalPreview() {


      return () => {
        return (
          <div class="space-y-4 p-4">
            {model2.showPopupParent && (
              <PopupParent/>
            )}
          </div>
        )
      }
    }

    app = createApp(<PortalPreview/>, false).mount(root)
    expect(portalContainer.querySelector('#test')).toBeNull()

    model.visible = true
    app.render()
    expect(portalContainer.querySelector('#test')).toBeInstanceOf(HTMLDivElement)

    model2.showPopupParent = false
    app.render()
    expect(portalContainer.querySelector('#test')).toBeNull()
  })
})

describe('Portal', () => {
  /**
   * 含 `test.failing` 的用例：描述「自身所在容器 / 前后兄弟 / 移出再原地」的 DOM 契约；实现就绪后改为 `test` 即可在 CI 中强制通过。
   * `test.failing` 在断言失败时记为通过，全部断言通过时反而会失败，便于 TDD。
   * 首屏若还拿不到「原地」父级（如首次 render 前无法 query 到本层壳），可先传外部 container，有节点后再切到 host（见「先外部→原地」用例）。
   */
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
  test('可正常清理子节点', () => {
    const portalContainer = document.createElement('div')


    function PopupContent() {
      return () => (
        <div>PopupContent</div>
      )
    }

    const model = reactive({ visible: false })

    function Popup() {
      function togglePopup() {
        model.visible = !model.visible
      }

      return () => {
        return (
          <>
            <button onClick={togglePopup} class="p-1 text-blue-500">toggle popup</button>
            {model.visible && (
              <Portal container={portalContainer}>
                <div class="absolute shadow-md inset-1/3 p-4 bg-gray-100" id="test">
                  <PopupContent/>
                </div>
              </Portal>
            )}
          </>
        )
      }
    }

    function PopupParent() {
      return () => {
        return (
          <div class="border border-gray-100">
            this is popup parent component.
            <Popup/>
          </div>
        )
      }
    }
    const model2 = reactive({
      showPopupParent: true
    })

    function PortalPreview() {
      return () => {
        return (
          <div class="space-y-4 p-4">
            {model2.showPopupParent && (
              <PopupParent/>
            )}
          </div>
        )
      }
    }

    app = createApp(<PortalPreview/>, false).mount(root)
    expect(portalContainer.querySelector('#test')).toBeNull()

    model.visible = true
    app.render()
    expect(portalContainer.querySelector('#test')).toBeInstanceOf(HTMLDivElement)

    model2.showPopupParent = false
    app.render()
    expect(portalContainer.querySelector('#test')).toBeNull()
  })

  test('条件渲染关闭时，Portal 内 createDynamicRef 的清理函数会被调用', () => {
    const portalContainer = document.createElement('div')
    const onUnmount = jest.fn()
    const viewModel = reactive({ open: false })

    const ref = createDynamicRef(() => {
      return onUnmount
    })

    function App() {
      return () => {
        return (
          <div>
            <div><button>btn</button></div>
            <Portal container={portalContainer}>
              {viewModel.open && (
                <div ref={ref} id="portal-popup">弹出内容</div>
              )}
            </Portal>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(portalContainer.querySelector('#portal-popup')).toBeNull()
    expect(onUnmount).not.toHaveBeenCalled()

    viewModel.open = true
    app.render()
    expect(portalContainer.querySelector('#portal-popup')).toBeInstanceOf(HTMLDivElement)
    expect(onUnmount).not.toHaveBeenCalled()

    viewModel.open = false
    app.render()
    expect(portalContainer.querySelector('#portal-popup')).toBeNull()
    expect(onUnmount).toHaveBeenCalledTimes(1)
  })

  test('container 在多次重渲染中保持不变时，子节点仍挂在同一容器且为同一 DOM 节点', () => {
    const container = document.createElement('div')
    const model = reactive({ tick: 0 })

    function App() {
      return () => {
        return (
          <div>
            <Portal container={container}>
              <span id="portal-tick">{model.tick}</span>
            </Portal>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    const el = container.querySelector('#portal-tick')
    expect(el).toBeInstanceOf(HTMLSpanElement)
    expect(el?.textContent).toBe('0')
    expect(root.querySelector('#portal-tick')).toBeNull()

    for (let i = 1; i <= 3; i++) {
      model.tick = i
      app.render()
      expect(container.querySelector('#portal-tick')).toBe(el)
      expect(el?.textContent).toBe(String(i))
    }
  })

  /**
   * 「自身所在容器」= 与不用 Portal 时、上层 diff 的父容器一致（实现上即 `container` 取当前组件层叠的父级 DOM 节点，与 `expectContainer` 同）。
   * 与「另两个与树无关的 div」用例一起，覆盖 container 在 body / 原地 / 旁路容器 间任意切换时的落点与兄弟关系。
   */
  test('container 在 document.body 与「自身所在父节点」间切换，子节点在目标间正确迁移', () => {
    const m = reactive({ toBody: true })

    function App() {
      return () => {
        const inPlaceParent = root.querySelector<HTMLDivElement>('#p-shell')
        return (
          <div id="p-shell">
            <Portal container={m.toBody ? document.body : inPlaceParent!}>
              <b id="portal-body-inplace">moved</b>
            </Portal>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    expect(document.body.querySelector('#portal-body-inplace')).toBeInstanceOf(HTMLElement)
    const shell = root.querySelector<HTMLDivElement>('#p-shell')!
    expect(shell.querySelector('#portal-body-inplace')).toBeNull()

    m.toBody = false
    app.render()
    const b = shell.querySelector('#portal-body-inplace')
    expect(b).toBeInstanceOf(HTMLElement)
    expect(b?.parentNode).toBe(shell)
    expect(document.body.querySelector('#portal-body-inplace')).toBeNull()

    m.toBody = true
    app.render()
    expect(document.body.querySelector('#portal-body-inplace')).toBeInstanceOf(HTMLElement)
    expect(shell.querySelector('#portal-body-inplace')).toBeNull()
  })

  test('container 在「外部、body、自身所在父节点」间切换，Portal 后续兄弟仍驻留原父且相对顺序正确', () => {
    const ext = document.createElement('div')
    ext.id = 'port-external-dest'
    const extAnchor = document.createElement('span')
    extAnchor.id = 'ext-anchor'
    ext.appendChild(extAnchor)
    const m = reactive({ where: 'ext' as 'ext' | 'body' | 'inPlace' })

    function App() {
      return () => {
        const parent = root.querySelector<HTMLDivElement>('#p-shell-b')
        const container =
          m.where === 'ext' ? ext
            : m.where === 'body' ? document.body
            : (parent!)

        return (
          <div id="p-shell-b" class="p-shell-b">
            <Portal container={container}>
              <b id="portal-order" class="portal-moved">P</b>
            </Portal>
            <i id="after-sibling" class="after">A</i>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)

    const shell = root.querySelector<HTMLDivElement>('#p-shell-b')!
    const getAfter = () => shell.querySelector('#after-sibling') as HTMLElement | null
    const childIds = () => Array.from(shell.children).map(c => c.id)

    // 1) 外部 ext：P 在 ext 内，后续兄弟 A 仅留在 p-shell
    expect(ext.querySelector('#portal-order')).toBeInstanceOf(HTMLElement)
    expect(Array.from(ext.children).map(c => c.id)).toEqual(['ext-anchor', 'portal-order'])
    expect(getAfter()).toBeInstanceOf(HTMLElement)
    expect(shell.querySelector('#portal-order')).toBeNull()
    expect(childIds()).toEqual(['after-sibling'])
    const afterEl = getAfter()!

    // 2) 自身所在父节点：遵循模板顺序（P 在 A 前）
    m.where = 'inPlace'
    app.render()
    expect(ext.querySelector('#portal-order')).toBeNull()
    expect(getAfter()).toBe(afterEl)
    expect(childIds()).toEqual(['portal-order', 'after-sibling'])
    const p1 = shell.querySelector('#portal-order')!
    expect(p1.nextElementSibling).toBe(getAfter())

    // 3) body：P 在 body，A 仍只在 p-shell，不丢、不错位
    m.where = 'body'
    app.render()
    expect(document.body.querySelector('#portal-order')?.parentNode).toBe(document.body)
    expect(shell.querySelector('#portal-order')).toBeNull()
    expect(getAfter()).toBe(afterEl)
    expect(afterEl.parentNode).toBe(shell)
    expect(childIds()).toEqual(['after-sibling'])

    // 4) 再外部再原地：后续兄弟与顺序仍正确
    m.where = 'ext'
    app.render()
    expect(ext.querySelector('#portal-order')).toBeInstanceOf(HTMLElement)
    expect(Array.from(ext.children).map(c => c.id)).toEqual(['ext-anchor', 'portal-order'])
    expect(getAfter()).toBe(afterEl)
    expect(childIds()).toEqual(['after-sibling'])

    m.where = 'inPlace'
    app.render()
    expect(getAfter()).toBe(afterEl)
    expect(childIds()).toEqual(['portal-order', 'after-sibling'])
  })

  test('Portal 前后均有兄弟时，在「自身所在父节点、body」间切换，兄弟保持顺序且仅 Portal 子树迁移', () => {
    const m = reactive({ inPlace: false })

    function App() {
      return () => {
        const parent = root.querySelector<HTMLDivElement>('#p-sandwich')
        const container = m.inPlace && parent ? parent : document.body

        return (
          <div id="p-sandwich" class="p-sandwich">
            <em id="before-sandwich" class="before">front</em>
            <Portal container={container}>
              <b id="portal-sandwich">P</b>
            </Portal>
            <i id="after-sandwich" class="after">back</i>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)

    const shell = root.querySelector<HTMLDivElement>('#p-sandwich')!
    const childIds = () => Array.from(shell.children).map(c => c.id)
    const getBefore = () => shell.querySelector<HTMLElement>('#before-sandwich')
    const getAfter = () => shell.querySelector<HTMLElement>('#after-sandwich')
    const beforeEl = getBefore()!
    const afterEl = getAfter()!

    // 1) 初始 body：P 在 body，壳内只保留前、后兄弟，顺序为 before → after
    expect(document.body.querySelector('#portal-sandwich')?.parentNode).toBe(document.body)
    expect(shell.querySelector('#portal-sandwich')).toBeNull()
    expect(getBefore()).toBe(beforeEl)
    expect(getAfter()).toBe(afterEl)
    expect(beforeEl.nextElementSibling).toBe(afterEl)
    expect(childIds()).toEqual(['before-sandwich', 'after-sandwich'])

    // 2) 自身所在父节点：遵循模板顺序（before -> P -> after）
    m.inPlace = true
    app.render()
    expect(document.body.querySelector('#portal-sandwich')).toBeNull()
    expect(getBefore()).toBe(beforeEl)
    expect(getAfter()).toBe(afterEl)
    expect(childIds()).toEqual(['before-sandwich', 'portal-sandwich', 'after-sandwich'])
    {
      const p = shell.querySelector<HTMLElement>('#portal-sandwich')!
      expect(beforeEl.nextElementSibling).toBe(p)
      expect(p.nextElementSibling).toBe(afterEl)
    }

    // 3) 再切 body：P 在 body，前、后兄弟仍只在壳内且相对顺序不变
    m.inPlace = false
    app.render()
    expect(document.body.querySelector('#portal-sandwich')?.parentNode).toBe(document.body)
    expect(shell.querySelector('#portal-sandwich')).toBeNull()
    expect(getBefore()).toBe(beforeEl)
    expect(getAfter()).toBe(afterEl)
    expect(beforeEl.nextElementSibling).toBe(afterEl)
    expect(childIds()).toEqual(['before-sandwich', 'after-sandwich'])

    // 4) 再回自身所在父节点，前中后三段的元素顺序与引用应恢复
    m.inPlace = true
    app.render()
    expect(childIds()).toEqual(['before-sandwich', 'portal-sandwich', 'after-sandwich'])
    {
      const p2 = shell.querySelector<HTMLElement>('#portal-sandwich')!
      expect(beforeEl.nextElementSibling).toBe(p2)
      expect(p2.nextElementSibling).toBe(afterEl)
    }
  })

  // 首屏常拿不到「原地」父级（如尚未挂载、首次 render 时 query 不到本层壳），可先用指定外部 container；#p-sequence 出现后再用 host 作原地，再与「移出 / 再原地」组合。
  test('顺序契约：先外部（首屏可拿不到原地父级）→ 原地 before,自身,after → 移出 → 再原地恢复', () => {
    const ext = document.createElement('div')
    ext.id = 'port-sequence-external'
    const extAnchor = document.createElement('span')
    extAnchor.id = 'seq-ext-anchor'
    ext.appendChild(extAnchor)
    const m = reactive({ inPlace: false })

    function App() {
      return () => {
        const host = root.querySelector<HTMLDivElement>('#p-sequence')
        const container = m.inPlace && host ? host : ext
        return (
          <div id="p-sequence">
            <span id="seq-before" />
            <Portal container={container}>
              <b id="seq-self" />
            </Portal>
            <i id="seq-after" />
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    const host = root.querySelector<HTMLDivElement>('#p-sequence')!
    const list = () => Array.from(host.children).map(c => c.id)
    const selfInExt = () => ext.querySelector('#seq-self')
    const selfInHost = () => host.querySelector('#seq-self')

    // 1) 首次仅能用外部：自身在 ext，壳内为 before, after（与「移出」时一致）
    expect(selfInExt()).toBeInstanceOf(HTMLElement)
    expect(Array.from(ext.children).map(c => c.id)).toEqual(['seq-ext-anchor', 'seq-self'])
    expect(selfInHost()).toBeNull()
    expect(list()).toEqual(['seq-before', 'seq-after'])
    {
      const before = host.querySelector('#seq-before')!
      const after = host.querySelector('#seq-after')!
      expect(before.nextElementSibling).toBe(after)
    }

    m.inPlace = true
    app.render()
    // 2) 有 host 后切到原地：遵循模板顺序（before -> self -> after）
    expect(selfInExt()).toBeNull()
    expect(selfInHost()).toBeInstanceOf(HTMLElement)
    expect(list()).toEqual(['seq-before', 'seq-self', 'seq-after'])
    {
      const self = selfInHost() as HTMLElement
      const before = host.querySelector('#seq-before')!
      const after = host.querySelector('#seq-after')!
      expect(before.nextElementSibling).toBe(self)
      expect(self.nextElementSibling).toBe(after)
    }

    m.inPlace = false
    app.render()
    // 3) 移出：同首次，壳内 before, after，自身在 ext
    expect(list()).toEqual(['seq-before', 'seq-after'])
    expect(selfInExt()).toBeInstanceOf(HTMLElement)
    expect(Array.from(ext.children).map(c => c.id)).toEqual(['seq-ext-anchor', 'seq-self'])
    expect(selfInHost()).toBeNull()

    m.inPlace = true
    app.render()
    // 4) 再原地：与 2) 相同（模板顺序）
    expect(list()).toEqual(['seq-before', 'seq-self', 'seq-after'])
    {
      const self = selfInHost() as HTMLElement
      const before = host.querySelector('#seq-before')!
      const after = host.querySelector('#seq-after')!
      expect(before.nextElementSibling).toBe(self)
      expect(self.nextElementSibling).toBe(after)
    }
  })

  test('container 在两个与组件 vdom 树无直接父子关系的 div 间切换，子节点只在当前容器内', () => {
    const boxA = document.createElement('div')
    const boxB = document.createElement('div')
    boxA.id = 'portal-box-a'
    boxB.id = 'portal-box-b'
    root.appendChild(boxA)
    root.appendChild(boxB)
    const model = reactive({ inA: true })

    function App() {
      return () => {
        return (
          <div>
            <Portal container={model.inA ? boxA : boxB}>
              <i id="portal-twin-boxes">t</i>
            </Portal>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    let el = boxA.querySelector('#portal-twin-boxes')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(boxB.querySelector('#portal-twin-boxes')).toBeNull()

    model.inA = false
    app.render()
    el = boxB.querySelector('#portal-twin-boxes')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(boxA.querySelector('#portal-twin-boxes')).toBeNull()

    model.inA = true
    app.render()
    el = boxA.querySelector('#portal-twin-boxes')
    expect(el).toBeInstanceOf(HTMLElement)
    expect(boxB.querySelector('#portal-twin-boxes')).toBeNull()
  })

  test('Portal 后为组件节点时，在 body 与自身所在父节点间切换，组件节点保持在原父容器', () => {
    const m = reactive({ inPlace: false })

    function TailComp() {
      return () => {
        return <span id="tail-component">tail</span>
      }
    }

    function App() {
      return () => {
        const parent = root.querySelector<HTMLDivElement>('#p-shell-comp')
        const container = m.inPlace && parent ? parent : document.body
        return (
          <div id="p-shell-comp">
            <Portal container={container}>
              <b id="portal-head">P</b>
            </Portal>
            <TailComp/>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    const shell = root.querySelector<HTMLDivElement>('#p-shell-comp')!
    const childIds = () => Array.from(shell.children).map(c => c.id)
    const tail = shell.querySelector('#tail-component')

    // 初始 body：P 在 body，组件节点仍在原壳
    expect(document.body.querySelector('#portal-head')?.parentNode).toBe(document.body)
    expect(shell.querySelector('#portal-head')).toBeNull()
    expect(tail).toBeInstanceOf(HTMLElement)
    expect(childIds()).toEqual(['tail-component'])

    m.inPlace = true
    app.render()
    // 原地：遵循模板顺序（P 在 TailComp 前）
    const p1 = shell.querySelector('#portal-head')
    const tail1 = shell.querySelector('#tail-component')
    expect(p1).toBeInstanceOf(HTMLElement)
    expect(tail1).toBeInstanceOf(HTMLElement)
    expect(childIds()).toEqual(['portal-head', 'tail-component'])
    expect(p1?.nextElementSibling).toBe(tail1)

    m.inPlace = false
    app.render()
    // 再回 body：P 回 body，组件节点不受影响
    expect(document.body.querySelector('#portal-head')?.parentNode).toBe(document.body)
    expect(shell.querySelector('#portal-head')).toBeNull()
    expect(shell.querySelector('#tail-component')).toBe(tail)
    expect(childIds()).toEqual(['tail-component'])
  })

  test('Portal 内包裹仅透传 children 的子组件时，更新子节点属性不会再次触发该节点的插入 DOM 调用', () => {
    const target = document.createElement('div')
    target.id = 'portal-target'
    const anchor = document.createElement('i')
    anchor.id = 'anchor'
    target.appendChild(anchor)
    const model = reactive({ cls: 'a' })
    const renderer = new DomRenderer()
    let insertCallsForChild = 0

    const rawAppend = renderer.appendChild.bind(renderer)
    const rawPrepend = renderer.prependChild.bind(renderer)
    const rawInsertAfter = renderer.insertAfter.bind(renderer)

    renderer.appendChild = ((parent: HTMLElement, newChild: HTMLElement | Text) => {
      if ((newChild as HTMLElement | Text).nodeType === 1
        && (newChild as HTMLElement).id === 'portal-child') {
        insertCallsForChild++
      }
      rawAppend(parent, newChild)
    }) as typeof renderer.appendChild

    renderer.prependChild = ((parent: HTMLElement, newChild: HTMLElement | Text) => {
      if ((newChild as HTMLElement | Text).nodeType === 1
        && (newChild as HTMLElement).id === 'portal-child') {
        insertCallsForChild++
      }
      rawPrepend(parent, newChild)
    }) as typeof renderer.prependChild

    renderer.insertAfter = ((newNode: HTMLElement | Text, refNode: HTMLElement | Text) => {
      if ((newNode as HTMLElement | Text).nodeType === 1
        && (newNode as HTMLElement).id === 'portal-child') {
        insertCallsForChild++
      }
      rawInsertAfter(newNode, refNode)
    }) as typeof renderer.insertAfter

    function PassThrough(props: {children: any}) {
      return () => props.children
    }

    function App() {
      return () => {
        return (
          <div>
            <Portal container={target}>
              <PassThrough>
                <span id="portal-child" class={model.cls}>child</span>
              </PassThrough>
            </Portal>
          </div>
        )
      }
    }

    app = createApp(<App/>, {
      autoUpdate: false,
      nativeRenderer: renderer
    }).mount(root)
    const first = target.querySelector('#portal-child') as HTMLSpanElement | null
    expect(first).toBeInstanceOf(HTMLSpanElement)
    expect(target.querySelectorAll('#portal-child').length).toBe(1)
    expect(target.lastElementChild?.id).toBe('portal-child')
    expect(insertCallsForChild).toBe(1)

    model.cls = 'b'
    app.render()
    const second = target.querySelector('#portal-child') as HTMLSpanElement | null
    expect(second).toBe(first)
    expect(second?.getAttribute('class')).toBe('b')
    expect(target.querySelectorAll('#portal-child').length).toBe(1)
    expect(target.lastElementChild?.id).toBe('portal-child')
    // 关键断言：属性更新仅原地 patch，不应再次调用插入 DOM 方法
    expect(insertCallsForChild).toBe(1)
  })

  test('Portal 子节点会插入到目标容器最后', () => {
    const target = document.createElement('div')
    target.id = 'portal-end-target'
    const first = document.createElement('span')
    first.id = 'existing-1'
    const second = document.createElement('span')
    second.id = 'existing-2'
    target.appendChild(first)
    target.appendChild(second)

    function App() {
      return () => {
        return (
          <div>
            <Portal container={target}>
              <b id="portal-tail">P</b>
            </Portal>
          </div>
        )
      }
    }

    app = createApp(<App/>, false).mount(root)
    const order = Array.from(target.children).map(node => node.id)
    expect(order).toEqual(['existing-1', 'existing-2', 'portal-tail'])
    expect(target.lastElementChild?.id).toBe('portal-tail')
  })
})


