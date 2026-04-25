import { Application, reactive, Portal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'

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
              <Portal host={portalContainer}>
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
              <Portal host={portalContainer}>
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


