import { isReactive, reactive } from '@viewfly/core'

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
  test('复杂对象返回代理对象', () => {
    expect(isReactive(reactive({}))).toBeTruthy()
    expect(isReactive(reactive([]))).toBeTruthy()
    expect(isReactive(reactive(new Date()))).toBeTruthy()
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
      date: new Date(),
      math: Math,
      class: new Test()
    })

    expect(isReactive(model.obj)).toBeTruthy()
    expect(isReactive(model.map)).toBeTruthy()
    expect(isReactive(model.weakMap)).toBeTruthy()
    expect(isReactive(model.set)).toBeTruthy()
    expect(isReactive(model.weakSet)).toBeTruthy()
    expect(isReactive(model.date)).toBeTruthy()
    expect(isReactive(model.math)).toBeTruthy()
    expect(isReactive(model.class)).toBeTruthy()
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
})
