import { createShallowReadonlyProxy, isReactive, reactive, watchEffect } from '@viewfly/core'

function createCounter(effect: () => void) {
  let count = 0
  const stop = watchEffect(() => {
    effect()
    count++
  })
  return {
    reset() {
      count = 0
    },
    value() {
      return count
    },
    stop
  }
}

describe('响应式普通对象：基础语义', () => {
  test('reactive(plain object) 返回响应式对象', () => {
    const obj = reactive({ a: 1 })
    expect(isReactive(obj)).toBe(true)
  })

  test('读取与写入基础字段可用', () => {
    const obj = reactive({ a: 1, b: 'x' })
    expect(obj.a).toBe(1)
    expect(obj.b).toBe('x')
    obj.a = 2
    obj.b = 'y'
    expect(obj.a).toBe(2)
    expect(obj.b).toBe('y')
  })

  test('删除字段后读取为 undefined', () => {
    const obj = reactive<{ a?: number }>({ a: 1 })
    delete obj.a
    expect(obj.a).toBeUndefined()
    expect('a' in obj).toBe(false)
  })

  test('嵌套对象读取后应为响应式', () => {
    const obj = reactive({
      nested: {
        value: 1
      }
    })
    expect(isReactive(obj.nested)).toBe(true)
  })

  test('同一 nested 属性多次读取返回同一代理对象', () => {
    const obj = reactive({
      nested: {
        value: 1
      }
    })
    expect(obj.nested).toBe(obj.nested)
  })
})

describe('响应式普通对象：按属性 get 依赖', () => {
  test('读取属性依赖会在 set 同属性时更新', () => {
    const obj = reactive({ a: 1, b: 2 })
    const c = createCounter(() => {
      obj.a
    })
    c.reset()
    obj.a = 2
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('读取属性依赖不会被其它属性 set 误触发', () => {
    const obj = reactive({ a: 1, b: 2 })
    const c = createCounter(() => {
      obj.a
    })
    c.reset()
    obj.b = 3
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('读取属性依赖会在 delete 同属性时更新', () => {
    const obj = reactive<{ a?: number, b: number }>({ a: 1, b: 2 })
    const c = createCounter(() => {
      obj.a
    })
    c.reset()
    delete obj.a
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('删除不存在属性不会误触发读取属性依赖', () => {
    const obj = reactive<{ a?: number, b?: number }>({ a: 1 })
    const c = createCounter(() => {
      obj.a
    })
    c.reset()
    delete obj.b
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('赋相同值不应触发依赖更新', () => {
    const obj = reactive({ a: 1 })
    const c = createCounter(() => {
      obj.a
    })
    c.reset()
    obj.a = 1
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('赋 NaN 相同值不应触发依赖更新', () => {
    const obj = reactive({ a: Number.NaN })
    const c = createCounter(() => {
      obj.a
    })
    c.reset()
    obj.a = Number.NaN
    expect(c.value()).toBe(0)
    c.stop()
  })
})

describe('响应式普通对象：新增属性与 has/遍历依赖', () => {
  test('新增属性会触发遍历依赖（Object.keys）', () => {
    const obj = reactive<{ a: number, b?: number }>({ a: 1 })
    const c = createCounter(() => {
      Object.keys(obj)
    })
    c.reset()
    obj.b = 2
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('删除属性会触发遍历依赖（for...in）', () => {
    const obj = reactive<{ a: number, b?: number }>({ a: 1, b: 2 })
    const c = createCounter(() => {
      const keys: string[] = []
      // eslint-disable-next-line guard-for-in
      for (const k in obj) {
        keys.push(k)
      }
      keys.join(',')
    })
    c.reset()
    delete obj.b
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('has 依赖会在属性新增时更新', () => {
    const obj = reactive<{ a?: number }>({})
    const c = createCounter(() => {
      'a' in obj
    })
    c.reset()
    obj.a = 1
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('has 依赖会在属性删除时更新', () => {
    const obj = reactive<{ a?: number }>({ a: 1 })
    const c = createCounter(() => {
      'a' in obj
    })
    c.reset()
    delete obj.a
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('删除不存在属性不会误触发 has 依赖', () => {
    const obj = reactive<{ a?: number, b?: number }>({ a: 1 })
    const c = createCounter(() => {
      'a' in obj
    })
    c.reset()
    delete obj.b
    expect(c.value()).toBe(0)
    c.stop()
  })
})

describe('响应式普通对象：原型链与 symbol key', () => {
  test('symbol 属性可读写并触发依赖', () => {
    const key = Symbol('sym')
    const obj = reactive<{ [k: symbol]: number }>({ [key]: 1 })
    const c = createCounter(() => {
      obj[key]
    })
    c.reset()
    obj[key] = 2
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('原型链属性读取不影响自有属性依赖触发', () => {
    const proto = { p: 1 }
    const obj = reactive(Object.create(proto) as { a?: number, p: number })
    obj.a = 1
    const c = createCounter(() => {
      obj.a
    })
    c.reset()
    obj.p = 2
    expect(c.value()).toBe(0)
    c.stop()
  })
})

describe('响应式普通对象：只读代理行为', () => {
  test('只读代理不允许 set', () => {
    const ro = createShallowReadonlyProxy({ a: 1 })
    expect(() => {
      ;(ro as { a: number }).a = 2
    }).toThrow(/readonly/)
  })

  test('只读代理不允许 delete', () => {
    const ro = createShallowReadonlyProxy({ a: 1 })
    expect(() => {
      delete (ro as { a?: number }).a
    }).toThrow(/readonly/)
  })
})

describe('响应式普通对象：嵌套更新传播', () => {
  test('依赖 nested.xxx 会在 nested.xxx set 时更新', () => {
    const obj = reactive({
      nested: { value: 1 }
    })
    const c = createCounter(() => {
      obj.nested.value
    })
    c.reset()
    obj.nested.value = 2
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('替换 nested 对象会触发读取 nested 的依赖', () => {
    const obj = reactive({
      nested: { value: 1 }
    })
    const c = createCounter(() => {
      obj.nested
    })
    c.reset()
    obj.nested = { value: 2 }
    expect(c.value()).toBe(1)
    c.stop()
  })
})

