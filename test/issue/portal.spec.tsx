import { createSignal, JSXInternal, createRef, Application } from '@viewfly/core'
import { createApp, HTMLAttributes, createPortal } from '@viewfly/platform-browser'

interface PortalProps extends HTMLAttributes<any> {
  content: JSXInternal.Element
  host?: HTMLElement
}

describe('portal', () => {
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
    function Portal(props: PortalProps) {

      function render() {
        const { content, ...rest } = props
        return (
          <div {...rest} id="test">
            {content}
          </div>
        )
      }

      return createPortal(render, portalContainer)
    }

    function PopupContent() {
      return () => (
        <div>PopupContent</div>
      )
    }

    const visible = createSignal(false)

    function Popup() {
      function togglePopup() {
        visible.set(!visible())
      }

      return () => {
        return (
          <>
            <button onClick={togglePopup} class="p-1 text-blue-500">toggle popup</button>
            {visible() && (
              <Portal
                content={<PopupContent/>}
                class="absolute shadow-md inset-1/3 p-4 bg-gray-100"
              />
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

    const showPopupParent = createSignal(true)

    function PortalPreview() {


      return () => {
        return (
          <div class="space-y-4 p-4">
            {showPopupParent() && (
              <PopupParent/>
            )}
          </div>
        )
      }
    }

    app = createApp(<PortalPreview/>, false).mount(root)
    expect(portalContainer.querySelector('#test')).toBeNull()

    visible.set(true)
    app.render()
    expect(portalContainer.querySelector('#test')).toBeInstanceOf(HTMLDivElement)

    showPopupParent.set(false)
    app.render()
    expect(portalContainer.querySelector('#test')).toBeNull()
  })
})


