import { createApp } from '@viewfly/platform-browser'

import './index.scss'
import { computed, reactive } from '@viewfly/core'

export interface Model {
  id: number
  label: string
}

const random = (max: number) => Math.round(Math.random() * 1000) % max

const A = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean',
  'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive',
  'cheap', 'expensive', 'fancy']
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange']
const N = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse',
  'keyboard']

let nextId = 1

const buildData = (count: number) => {
  const data = new Array(count)

  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${A[random(A.length)]} ${C[random(C.length)]} ${N[random(N.length)]}`,
    }
  }

  return data
}
const model = reactive({
  rows: [] as Model[],
  selected: null as number | null
})

function add() {
  model.rows = model.rows.concat(buildData(1000))
}

function remove(id: number) {
  model.rows.splice(
    model.rows.findIndex((d) => d.id === id),
    1
  )
}

function select(id: number) {
  model.selected = id
}

function run() {
  model.rows = buildData(1000)
  model.selected = null
}

function update() {
  const _rows = model.rows
  for (let i = 0; i < _rows.length; i += 10) {
    _rows[i].label += ' !!!'
  }
}

function runLots() {
  model.rows = buildData(10000)
  model.selected = null
}

function clear() {
  model.rows = []
  model.selected = null
}

function swapRows() {
  const _rows = model.rows
  if (_rows.length > 998) {
    const d1 = _rows[1]
    const d998 = _rows[998]
    _rows[1] = d998
    _rows[998] = d1
  }
}

function Jumbotron() {
  return () => {
    return (
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>Viewfly2 (keyed)</h1>
          </div>
          <div class="col-md-6">
            <div class="row">
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="run"
                  onClick={run}
                >
                  Create 1,000 rows
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="runlots"
                  onClick={runLots}
                >
                  Create 10,000 rows
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="add"
                  onClick={add}
                >
                  Append 1,000 rows
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="update"
                  onClick={update}
                >
                  Update every 10th row
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="clear"
                  onClick={clear}
                >
                  Clear
                </button>
              </div>
              <div class="col-sm-6 smallpad">
                <button
                  type="button"
                  class="btn btn-primary btn-block"
                  id="swaprows"
                  onClick={swapRows}
                >
                  Swap Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

function Row(props: Model) {
  const isSelected = computed(() => {
    return model.selected === props.id
  })
  return () => {
    console.log(333)
    const { id, label } = props
    return <tr class={{ danger: isSelected.value }}>
      <td class="col-md-1">{id}</td>
      <td class="col-md-4">
        <a onClick={() => {
          select(id)
        }}>{label}</a>
      </td>
      <td class="col-md-1">
        <a onClick={() => remove(id)}>
          <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
        </a>
      </td>
      <td class="col-md-6"></td>
    </tr>
  }
}

function Table() {
  return () => {
    return (
      <table class="table table-hover table-striped test-data">
        <tbody>
        {
          model.rows.map(row => {
            return <Row key={row.id} id={row.id} label={row.label}/>
          })
        }
        </tbody>
      </table>
    )
  }
}

function App() {
  return () => {
    return (
      <>
        <Jumbotron/>
        <Table/>
        <span class="preloadicon glyphicon glyphicon-remove" aria-hidden="true"/>
      </>
    )
  }
}

createApp(<App/>).mount(document.getElementById('main')!)
