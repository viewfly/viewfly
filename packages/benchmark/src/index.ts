import { Bench } from 'tinybench'

async function run() {
  const bench = new Bench({ time: 800 })

  bench
    .add('raw object write/read', () => {
      const state = { count: 0 }
      state.count += 1
      return state.count
    })
    .add('proxy write/read', () => {
      const state = new Proxy({ count: 0 }, {})
      state.count += 1
      return state.count
    })
    .add('closure write/read', () => {
      let count = 0
      const get = () => count
      const set = (next: number) => {
        count = next
      }
      set(get() + 1)
      return get()
    })

  await bench.run()

  console.table(
    bench.tasks.map((task) => ({
      name: task.name,
      hz: task.result?.hz?.toFixed(2),
      'avg (ns)': task.result?.mean ? (task.result.mean * 1e9).toFixed(2) : '-',
      samples: task.result?.samples?.length ?? 0
    }))
  )
}

run().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
