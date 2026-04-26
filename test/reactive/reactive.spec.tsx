import { createShallowReadonlyProxy, flushReactiveEffectsSync, internalWrite, isReactive, nextTick, reactive, shallowReactive, watchEffect } from '@viewfly/core'

describe('reactive', () => {
  test('普通数据返回原始值', () => {
    expect(reactive(1)).toStrictEqual(1)
    expect(reactive('')).toStrictEqual('')
    expect(reactive(undefined)).toStrictEqual(undefined)
    expect(reactive(null)).toStrictEqual(null)
    expect(reactive(true)).toStrictEqual(true)
    expect(reactive(false)).toStrictEqual(false)
    const symbol = Symbol()
    expect(reactive(symbol)).toStrictEqual(symbol)
    const fn = function () {
      //
    }
    expect(reactive(fn)).toStrictEqual(fn)
  })
  test('原生对象返回原始对象', () => {
    expect(isReactive(reactive(new Date()))).toBeFalsy()
    expect(isReactive(reactive(Math))).toBeFalsy()
  })
  test('复杂对象返回代理对象', () => {
    expect(isReactive(reactive({}))).toBeTruthy()
    expect(isReactive(reactive([]))).toBeTruthy()
    expect(isReactive(reactive(new Map()))).toBeTruthy()
    expect(isReactive(reactive(new WeakMap()))).toBeTruthy()
    expect(isReactive(reactive(new Set()))).toBeTruthy()
    expect(isReactive(reactive(new WeakSet()))).toBeTruthy()

    class Test {
    }

    expect(isReactive(reactive(new Test()))).toBeTruthy()
  })

  test('简单值属性返回原始值', () => {
    const model = reactive({
      string: 'a',
      number: 1,
      true: true,
      false: false,
      null: null,
      undefined: undefined
    })

    expect(model.string).toBe('a')
    expect(model.number).toBe(1)
    expect(model.true).toBe(true)
    expect(model.false).toBe(false)
    expect(model.null).toBe(null)
    expect(model.undefined).toBe(undefined)
  })

  test('复杂值属性返回代理对象', () => {
    class Test {
    }

    const model = reactive({
      obj: {},
      map: new Map(),
      weakMap: new WeakMap(),
      set: new Set(),
      weakSet: new WeakSet(),
      math: Math,
      class: new Test()
    })

    expect(isReactive(model.obj)).toBeTruthy()
    expect(isReactive(model.map)).toBeTruthy()
    expect(isReactive(model.weakMap)).toBeTruthy()
    expect(isReactive(model.set)).toBeTruthy()
    expect(isReactive(model.weakSet)).toBeTruthy()
    expect(isReactive(model.class)).toBeTruthy()
  })

  test('复杂原生对象返回原始对象', () => {
    const model = reactive({
      date: new Date(),
      math: Math
    })
    expect(isReactive(model.date)).toBeFalsy()
    expect(isReactive(model.math)).toBeFalsy()
  })

  test('相同属性多次访问值相等', () => {
    class Test {
    }

    const model = reactive({
      obj: {},
      map: new Map(),
      weakMap: new WeakMap(),
      set: new Set(),
      weakSet: new WeakSet(),
      date: new Date(),
      math: Math,
      class: new Test()
    })

    expect(model.obj).toStrictEqual(model.obj)
    expect(model.map).toStrictEqual(model.map)
    expect(model.weakMap).toStrictEqual(model.weakMap)
    expect(model.set).toStrictEqual(model.set)
    expect(model.weakSet).toStrictEqual(model.weakSet)
    expect(model.date).toStrictEqual(model.date)
    expect(model.math).toStrictEqual(model.math)
    expect(model.class).toStrictEqual(model.class)
  })

  test('Map 支持 key、value 代理', () => {
    const map = new Map()
    map.set({ key: 'key' }, { value: 'value' })

    const model = reactive(map)

    for (const [key, value] of model) {
      expect(isReactive(key)).toBeTruthy()
      expect(isReactive(value)).toBeTruthy()
    }

    for (const key of model.keys()) {
      expect(isReactive(key)).toBeTruthy()
    }

    for (const value of model.values()) {
      expect(isReactive(value)).toBeTruthy()
    }

    for (const [key, value] of model.entries()) {
      expect(isReactive(key)).toBeTruthy()
      expect(isReactive(value)).toBeTruthy()
    }
  })


  test('Set 支持 key、value 代理', () => {
    const set = new Set()
    set.add({ key: 'key' })

    const model = reactive(set)

    for (const item of model) {
      expect(isReactive(item)).toBeTruthy()
    }

    for (const key of model.keys()) {
      expect(isReactive(key)).toBeTruthy()
    }

    for (const value of model.values()) {
      expect(isReactive(value)).toBeTruthy()
    }

    for (const [key, value] of model.entries()) {
      expect(isReactive(key)).toBeTruthy()
      expect(isReactive(value)).toBeTruthy()
      expect(key === value).toBeTruthy()
    }
  })

  test('只读对象不允许 delete 属性', () => {
    const readonly = createShallowReadonlyProxy({
      name: 'viewfly'
    })
    expect(() => {
      delete (readonly as {name?: string}).name
    }).toThrow(/readonly/)
  })

  test('嵌套 internalWrite 结束后仍保持只读保护', () => {
    const readonly = createShallowReadonlyProxy({
      value: 1
    }) as { value: number }

    internalWrite(() => {
      internalWrite(() => {
        readonly.value = 2
      })
    })
    expect(readonly.value).toBe(2)
    expect(() => {
      readonly.value = 3
    }).toThrow(/readonly/)
  })

  test('同一 raw 可分别创建 deep 与 shallow 代理', () => {
    const raw = {
      nested: {
        value: 1
      }
    }
    const deep = reactive(raw)
    const shallow = shallowReactive(raw)

    expect(deep).not.toBe(shallow)
    expect(isReactive(deep)).toBeTruthy()
    expect(isReactive(shallow)).toBeTruthy()
    expect(isReactive(deep.nested)).toBeTruthy()
    expect(isReactive(shallow.nested)).toBeFalsy()
  })
})

describe('reactive：数组代理方法', () => {
  test('some / every / find / findIndex 在响应式数组上可用', () => {
    const list = reactive([1, 2, 3, 4])
    expect(list.some(n => n > 3)).toBe(true)
    expect(list.every(n => n < 10)).toBe(true)
    expect(list.find(n => n % 2 === 0)).toBe(2)
    expect(list.findIndex(n => n === 3)).toBe(2)
  })

  test('includes、indexOf、join 会追踪迭代', () => {
    const list = reactive(['a', 'b', 'c'])
    expect(list.includes('b')).toBe(true)
    expect(list.indexOf('c')).toBe(2)
    expect(list.join('-')).toBe('a-b-c')
  })

  test('map、filter、reduce 与无初值的 reduce', () => {
    const list = reactive([1, 2, 3])
    expect(list.map(n => n * 2)).toEqual([2, 4, 6])
    expect(list.filter(n => n > 1)).toEqual([2, 3])
    expect(list.reduce((a, b) => a + b, 0)).toBe(6)
    expect(list.reduce((a, b) => a + b)).toBe(6)
  })

  test('reduceRight、splice、concat、pop、shift、unshift', () => {
    const list = reactive([1, 2, 3])
    expect(list.reduceRight((a, b) => a - b)).toBe(0)
    expect(list.splice(1, 1)).toEqual([2])
    expect(list.concat([4])).toEqual([1, 3, 4])
    const tail = reactive([10, 20])
    expect(tail.pop()).toBe(20)
    expect(tail.shift()).toBe(10)
    expect(tail.unshift(5)).toBe(1)
    expect([...tail]).toEqual([5])
  })

  test('splice 仅触发一次依赖更新', () => {
    const list = reactive([1, 2, 3, 4])
    let count = 0
    const unWatch = watchEffect(() => {
      list.length
      count++
    })
    count = 0
    list.splice(1, 2)
    flushReactiveEffectsSync()
    expect(count).toBe(1)
    unWatch()
  })

  test('数组变异触发时 effect 读取到变更后状态', () => {
    const list = reactive([1, 2, 3])
    const snapshots: string[] = []

    const unWatch = watchEffect(() => {
      snapshots.push(`${list.length}|${list[0]}|${list[list.length - 1]}`)
    })

    snapshots.length = 0

    list.push(4)
    flushReactiveEffectsSync()
    expect(snapshots.at(-1)).toBe('4|1|4')

    list.shift()
    flushReactiveEffectsSync()
    expect(snapshots.at(-1)).toBe('3|2|4')

    list.unshift(9)
    flushReactiveEffectsSync()
    expect(snapshots.at(-1)).toBe('4|9|4')

    list.pop()
    flushReactiveEffectsSync()
    expect(snapshots.at(-1)).toBe('3|9|3')

    list.splice(1, 1)
    flushReactiveEffectsSync()
    expect(snapshots.at(-1)).toBe('2|9|3')

    unWatch()
  })
})

describe('reactive：watchEffect 异常健壮性', () => {
  test('effect 抛错后后续变更仍可继续追踪', () => {
    const model = reactive({
      count: 0
    })
    let trackedRuns = 0
    const unWatch = watchEffect(() => {
      model.count
      if (model.count === 1) {
        throw new Error('watch-effect-error')
      }
      trackedRuns++
    })

    expect(trackedRuns).toBe(1)

    model.count = 1
    expect(() => {
      flushReactiveEffectsSync()
    }).toThrow('watch-effect-error')

    model.count = 2
    flushReactiveEffectsSync()
    expect(trackedRuns).toBe(2)
    unWatch()
  })

})

describe('reactive：异步调度语义', () => {
  test('watchEffect 在同一同步栈内不立即执行，nextTick 后执行', async () => {
    const model = reactive({
      count: 0
    })
    let runs = 0
    const unWatch = watchEffect(() => {
      model.count
      runs++
    })

    expect(runs).toBe(1)
    runs = 0
    model.count = 1
    model.count = 2
    expect(runs).toBe(0)
    await nextTick()
    expect(runs).toBe(1)
    unWatch()
  })
})
