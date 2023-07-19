

import { useSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import './router-index.scss'
import { RootRouter, RouterOutlet, useRouter } from '@viewfly/router'

const ROUTER_ITEMS = [
  {
    id: 'aaa',
    url: 'https://pic3.zhimg.com/v2-8a31c1a9c568526898346a3e8c60f06a_b.jpg',
  },
  {
    id: 'bbb',
    url: 'https://www.qqscb.com/uploads/allimg/211121/2-211121201J4.jpg',
  },
  {
    id: 'vvv',
    url: 'https://images.pexels.com/photos/10383803/pexels-photo-10383803.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
  },
  {
    id: 'www',
    url: 'https://photo.16pic.com/00/53/26/16pic_5326745_b.jpg'
  }
]

function App() {
  const count = useSignal(1)
  const router = useRouter()

  return () => {
    return (
      <div>
        <div class="main">
          <div>这是主界面</div>
          <div
            class="count"
            onClick={() => count.set(count() + 1)}
          >
            {count()}
          </div>

          <RouterOutlet config={[
            {
              name: '',
              component: AllItemView
            }
          ]}></RouterOutlet>
        </div>

        <div>
          <RouterOutlet config={[
            {
              name: '/test/:id',
              component: CorrectItem
            }
          ]} />
        </div>
      </div>
    )
  }
}

function AllItemView() {
  const router = useRouter()

  function navigateTo(id: string) {
    router.navigateTo(`/test/${id}`)
  }

  return () => {
    return (
      <div class="item-container">
        {
          ROUTER_ITEMS.map(item => {
            return (
              <div>
                <div
                  key={item.id}
                  class="image-container"
                  onClick={() => navigateTo(item.id)}
                >
                  <img src={item.url} alt="" />
                </div>
                <p>{item.id}</p>
              </div>
            )
          })
        }
      </div>
    )
  }
}

function CorrectItem() {
  const router = useRouter()
  // const id = router.param
  const id = ''
  const item = useSignal(ROUTER_ITEMS.find(i => i.id === id))

  return () => {
    const _item = item()
    if (!_item) {
      return null
    }

    return (
      <div>
        <div class="item-container">
          <div>
            <div key={_item.id} class="image-container">
              <img src={_item.url} alt="" />
            </div>
            <p>{_item.id}</p>
          </div>
        </div>
      </div>
    )
  }
}

createApp(document.getElementById('app')!, (
  <RootRouter>
    <App />
  </RootRouter>
))


// to tell user the button is useless
const destroyButton = document.getElementById('btn')
if (destroyButton) {
  destroyButton.addEventListener('click', () => window.alert('这个销毁按钮在路由测试界面没有，别按了'))
}