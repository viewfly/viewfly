

import { useSignal } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import './router-index.scss'
import { Router, Outlet, useRouter } from '@viewfly/router'

const ROUTER_ITEMS = [
  {
    id: 'animal_a',
    url: 'https://pic3.zhimg.com/v2-8a31c1a9c568526898346a3e8c60f06a_b.jpg',
  },
  {
    id: 'animal_b',
    url: 'https://www.qqscb.com/uploads/allimg/211121/2-211121201J4.jpg',
  },
  {
    id: 'road',
    url: 'https://images.pexels.com/photos/10383803/pexels-photo-10383803.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500',
  },
  {
    id: 'earth',
    url: 'https://photo.16pic.com/00/53/26/16pic_5326745_b.jpg'
  }
]

function App() {
  return () => {
    return (
      <div>
        <div class="main">
          <Outlet routes={[
            {
              path: '',
              component: AllItemView
            }
          ]}></Outlet>
        </div>

        <div>
          <Outlet routes={[
            {
              path: '/test/:id',
              component: SelectedItem
            }
          ]} />
        </div>
      </div>
    )
  }
}

function AllItemView() {
  const router = useRouter()

  return () => {
    return (
      <div class="image-container">
        {
          ROUTER_ITEMS.map(item => {
            return (
              <div>
                <div
                  key={item.id}
                  class="image"
                  onClick={() => router.to(`/test/${item.id}`)}
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

function SelectedItem() {
  const router = useRouter()
  const item = useSignal(getRouterItem())

  router.onRefresh.subscribe(() => {
    item.set(getRouterItem())
  })

  function getRouterItem() {
    const id = router.params.id || ''
    return ROUTER_ITEMS.find(item => id === item.id)
  }

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

createApp((
  <Router>
    <App />
  </Router>
)).mount(document.getElementById('app')!)


// to remove the useless destroy button.
const destroyButton = document.getElementById('btn')
if (destroyButton) {
  destroyButton.remove()
}