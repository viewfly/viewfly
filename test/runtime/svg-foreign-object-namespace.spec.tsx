import { createApp } from '@viewfly/platform-browser'
import type { Application } from '@viewfly/core'

/** SVG 子树与 HTML 嵌入的命名空间（DOM 规范） */
const SVG_NS = 'http://www.w3.org/2000/svg'
const HTML_NS = 'http://www.w3.org/1999/xhtml'

describe('SVG foreignObject 命名空间', () => {
  let root: HTMLElement
  let app: Application

  beforeEach(() => {
    root = document.createElement('div')
    document.body.appendChild(root)
  })

  afterEach(() => {
    app?.destroy()
    root.remove()
  })

  /**
   * `foreignObject` 本身是 SVG 元素，须处于 SVG 命名空间；
   * 其内部的 HTML（如 div）须处于 HTML 命名空间。
   *
   * 若 `getNameSpace('foreignObject', 'svg')` 对 foreignObject 根节点也返回空，
   * 会用 `document.createElement` 建出非 SVG 的 foreignObject，与规范不符。
   */
  test('foreignObject 在 SVG 命名空间，子内容为 HTML 命名空间', () => {
    function App() {
      return () => (
        <svg width="120" height="80">
          <foreignObject width="100" height="60" x="0" y="0">
            <div data-testid="fo-html-child">embedded</div>
          </foreignObject>
        </svg>
      )
    }

    app = createApp(<App />).mount(root)

    const svg = root.querySelector('svg')
    const fo = root.querySelector('foreignObject')
    const inner = root.querySelector('[data-testid="fo-html-child"]')

    expect(svg).not.toBeNull()
    expect(fo).not.toBeNull()
    expect(inner).not.toBeNull()

    expect(svg!.namespaceURI).toBe(SVG_NS)
    expect(fo!.namespaceURI).toBe(SVG_NS)
    expect(inner!.namespaceURI).toBe(HTML_NS)
  })
})
