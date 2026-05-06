import { FormPanelA } from './components/FormPanelA'
import { FormPanelB } from './components/FormPanelB'
import { FormPanelC } from './components/FormPanelC'
import { logRoute } from './log-route'

export function Home() {
  console.info('[pg-hmr] Home setup() 执行')
  logRoute('render Home')
  let homeViewRenders = 0
  return () => {
    homeViewRenders += 1
    console.info(`[pg-hmr] Home viewRender() 第 ${homeViewRenders} 次`)
    return (
      <div>
        <p class="pg-intro">
          <strong>HMR 演示：3</strong>
          下方三个子组件各有独立表单与「内层1渲染次数」。修改<strong>某一个</strong>函数组件的源码（例如改一段文案）并保存，
          在控制台与页面上观察：理想情况2下仅该区块计数上升，其它区块计数不变。
        </p>
        <div class="pg-grid">
          <FormPanelA />
          <FormPanelB />
          <FormPanelC />
        </div>
      </div>
    )
  }
}
