import { useSignal } from '@viewfly/core';
import { createApp } from '@viewfly/platform-browser'

import './index.scss'

let ID = 1

function _random(max) {
  return Math.round(Math.random() * 1000) % max
}

export interface Model {
  id: number
  label: string
}

export function buildData(count = 4): Model[] {
  const adjectives = [
    'pretty',
    'large',
    'big',
    'small',
    'tall',
    'short',
    'long',
    'handsome',
    'plain',
    'quaint',
    'clean',
    'elegant',
    'easy',
    'angry',
    'crazy',
    'helpful',
    'mushy',
    'odd',
    'unsightly',
    'adorable',
    'important',
    'inexpensive',
    'cheap',
    'expensive',
    'fancy'
  ]
  const colours = [
    'red',
    'yellow',
    'blue',
    'green',
    'pink',
    'brown',
    'purple',
    'brown',
    'white',
    'black',
    'orange'
  ]
  const nouns = [
    'table',
    'chair',
    'house',
    'bbq',
    'desk',
    'car',
    'pony',
    'cookie',
    'sandwich',
    'burger',
    'pizza',
    'mouse',
    'keyboard'
  ]
  const data: Model[] = []
  for (let i = 0; i < count; i++)
    data.push({
      id: ID++,
      label:
        adjectives[_random(adjectives.length)] +
        ' ' +
        colours[_random(colours.length)] +
        ' ' +
        nouns[_random(nouns.length)]
    })
  return data
}


const selected = useSignal<number | null>(null)
const rows = useSignal<Model[]>([])

function setRows(update = rows().slice()) {
  rows.set(update)
}

function add() {
  rows.set(rows().concat(buildData(1000)))
}

function remove(id) {
  rows().splice(
    rows().findIndex((d) => d.id === id),
    1
  )
  setRows()
}

function select(id) {
  selected.set(id)
}

function run() {
  setRows(buildData())
  selected.set(null)
}

function update() {
  const _rows = rows()
  for (let i = 0; i < _rows.length; i += 10) {
    _rows[i].label += ' !!!'
  }
  setRows()
}

function runLots() {
  setRows(buildData(10000))
  selected.set(null)
}

function clear() {
  setRows([])
  selected.set(null)
}

function swapRows() {
  const _rows = rows()
  if (_rows.length > 998) {
    const d1 = _rows[1]
    const d998 = _rows[998]
    _rows[1] = d998
    _rows[998] = d1
    setRows()
  }
}

function Jumbotron() {
  return () => {
    return (
      <div class="jumbotron">
        <div class="row">
          <div class="col-md-6">
            <h1>Viewfly (keyed)</h1>
          </div>
          <div class="col-md-6">
            <div class="row" style={{display: 'flex'}}>
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

function Table() {
  return () => {
    console.log('rows: ', rows())
    return (
      <table class="table table-hover table-striped test-data">
        <tbody>
        {
          rows().map(row => {
            const { id, label } = row
            return (
              <tr class={{ danger: id === selected() }}>
                <td class="col-md-1">{id}</td>
                <td class="col-md-4">
                  <a onClick={() => {
                    console.log(id)
                    select(id)
                  }}>{label}</a>
                </td>
                <td class="col-md-1">
                  <a onClick={() => remove(id)}>
                    cancel
                    <span class="glyphicon glyphicon-remove" aria-hidden="true"></span>
                  </a>
                </td>
                <td class="col-md-6"></td>
              </tr>
            )
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
      </>
    )
  }
}


createApp(document.getElementById('app')!, <App/>)
