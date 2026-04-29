import { inject } from '@viewfly/core'
import { createApp } from '@viewfly/platform-browser'
import { Link, Router, RouterModule, RouterOutlet, useParams } from '@viewfly/router'

function logRoute(tag: string, extra?: Record<string, unknown>) {
  const payload = extra ? ` ${JSON.stringify(extra)}` : ''
  console.log(`[playground-router] ${tag}${payload}`)
}

const styles = {
  page: {
    margin: '24px auto',
    maxWidth: '760px',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    color: '#1f2937'
  },
  nav: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px'
  },
  link: {
    padding: '6px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    textDecoration: 'none',
    color: '#111827',
    background: '#ffffff'
  },
  panel: {
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '16px',
    background: '#f9fafb'
  },
  title: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: 600
  },
  row: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const
  },
  button: {
    padding: '6px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    background: '#ffffff',
    cursor: 'pointer'
  },
  hint: {
    marginTop: '12px',
    color: '#6b7280',
    fontSize: '13px'
  },
  code: {
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    padding: '2px 6px',
    borderRadius: '6px',
    background: '#eef2ff'
  }
}

function Home() {
  const router = inject(Router)
  logRoute('render Home')
  return () => (
    <div style={styles.panel}>
      <p style={styles.title}>Home</p>
      <div style={styles.row}>
        <button
          style={styles.button}
          type="button"
          onClick={() => {
            logRoute('click Home -> /list')
            router.navigateTo('/list')
          }}
        >
          去列表
        </button>
      </div>
    </div>
  )
}

function List() {
  const router = inject(Router)
  logRoute('render List')
  return () => (
    <div style={styles.panel}>
      <p style={styles.title}>List</p>
      <div style={styles.row}>
        <button
          style={styles.button}
          type="button"
          onClick={() => {
            logRoute('click List -> /user/1')
            router.navigateTo('/user/1')
          }}
        >
          用户 1
        </button>
        <button
          style={styles.button}
          type="button"
          onClick={() => {
            logRoute('click List -> /user/2')
            router.navigateTo('/user/2')
          }}
        >
          用户 2
        </button>
      </div>
      <p style={styles.hint}>点击按钮后可在 User 页面看到动态参数变化。</p>
    </div>
  )
}

function UserDetail() {
  const params = useParams<{ id?: string }>()
  const router = inject(Router)
  logRoute('render User', { id: params.id ?? null })
  return () => (
    <div style={styles.panel}>
      <p style={styles.title}>User</p>
      <p>当前用户 ID: <span style={styles.code}>{params.id ?? '-'}</span></p>
      <div style={styles.row}>
        <button
          style={styles.button}
          type="button"
          onClick={() => {
            const nextId = params.id === '1' ? '2' : '1'
            logRoute('click User toggle', { currentId: params.id ?? null, nextId })
            router.navigateTo(`/user/${nextId}`)
          }}
        >
          切换用户
        </button>
      </div>
    </div>
  )
}

function App() {
  return () => (
    <div style={styles.page}>
      <nav style={styles.nav}>
        <Link style={styles.link} active="active" exact to="/">Home</Link>
        <Link style={styles.link} active="active" to="/list">List</Link>
        <Link style={styles.link} active="active" to="/user/1">User</Link>
      </nav>
      <RouterOutlet>
        未匹配到路由
      </RouterOutlet>
    </div>
  )
}

createApp(<App/>).use(new RouterModule({
  hooks: {
    beforeEach(from, to, next) {
      logRoute('beforeEach', {
        from: { pathname: from.pathname, hash: from.hash, queryParams: from.queryParams },
        to: { pathname: to.pathname, hash: to.hash, queryParams: to.queryParams }
      })
      next()
    },
    afterEach(to) {
      logRoute('afterEach', {
        to: { pathname: to.pathname, hash: to.hash, queryParams: to.queryParams }
      })
    }
  },
  routes: [
    { path: '', component: Home },
    { path: 'list', component: List },
    { path: 'user/:id', component: UserDetail }
  ]
})).mount(document.querySelector('#main')!)
