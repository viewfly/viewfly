import { isReactive, reactive, watchEffect } from '@viewfly/core'

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

describe('响应式 Set：基础语义', () => {
  test('reactive(Set) 返回响应式对象', () => {
    const set = reactive(new Set<number>())
    expect(isReactive(set)).toBe(true)
  })

  test('add/has/delete 基本可用', () => {
    const set = reactive(new Set<number>())
    set.add(1)
    expect(set.has(1)).toBe(true)
    expect(set.delete(1)).toBe(true)
    expect(set.has(1)).toBe(false)
    expect(set.delete(1)).toBe(false)
  })

  test('clear 会清空集合', () => {
    const set = reactive(new Set<number>([1, 2, 3]))
    set.clear()
    expect(set.size).toBe(0)
    expect(set.has(1)).toBe(false)
  })

  test('add 已存在值不改变 size', () => {
    const set = reactive(new Set<number>([1]))
    set.add(1)
    expect(set.size).toBe(1)
  })
})

describe('响应式 Set：has 依赖', () => {
  test('has(value) 依赖会在 add 新值时更新', () => {
    const set = reactive(new Set<number>())
    const c = createCounter(() => {
      set.has(1)
    })
    c.reset()
    set.add(1)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('has(value) 依赖会在 delete 该值时更新', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      set.has(1)
    })
    c.reset()
    set.delete(1)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('has(value) 依赖不应被 add 其它值误触发', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      set.has(1)
    })
    c.reset()
    set.add(2)
    expect(c.value()).toBe(0)
    c.stop()
  })
})

describe('响应式 Set：size 依赖', () => {
  test('size 依赖会在 add 新值时更新', () => {
    const set = reactive(new Set<number>())
    const c = createCounter(() => {
      set.size
    })
    c.reset()
    set.add(1)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('size 依赖在 add 已存在值时不应更新', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      set.size
    })
    c.reset()
    set.add(1)
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('size 依赖会在 delete 成功时更新', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      set.size
    })
    c.reset()
    set.delete(1)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('size 依赖在 delete 不存在值时不应更新', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      set.size
    })
    c.reset()
    set.delete(2)
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('size 依赖会在 clear 非空集合时更新', () => {
    const set = reactive(new Set<number>([1, 2]))
    const c = createCounter(() => {
      set.size
    })
    c.reset()
    set.clear()
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('size 依赖在 clear 空集合时不应更新', () => {
    const set = reactive(new Set<number>())
    const c = createCounter(() => {
      set.size
    })
    c.reset()
    set.clear()
    expect(c.value()).toBe(0)
    c.stop()
  })
})

describe('响应式 Set：迭代相关依赖', () => {
  test('for...of 依赖会在 add 后更新', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      let sum = 0
      for (const v of set) {
        sum += v
      }
      sum
    })
    c.reset()
    set.add(2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('values() 依赖会在 delete 后更新', () => {
    const set = reactive(new Set<number>([1, 2]))
    const c = createCounter(() => {
      [...set.values()]
    })
    c.reset()
    set.delete(2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('keys() 依赖会在 add 后更新', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      [...set.keys()]
    })
    c.reset()
    set.add(2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('entries() 依赖会在 clear 后更新', () => {
    const set = reactive(new Set<number>([1, 2]))
    const c = createCounter(() => {
      [...set.entries()]
    })
    c.reset()
    set.clear()
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('forEach 依赖会在 add 后更新', () => {
    const set = reactive(new Set<number>([1]))
    const c = createCounter(() => {
      let sum = 0
      set.forEach(v => {
        sum += v
      })
      sum
    })
    c.reset()
    set.add(2)
    expect(c.value()).toBe(1)
    c.stop()
  })
})

describe('响应式 Set：对象值代理行为', () => {
  test('对象值在 values() 中应为响应式', () => {
    const set = reactive(new Set<object>([{ id: 1 }]))
    const first = [...set.values()][0]
    expect(isReactive(first)).toBe(true)
  })

  test('对象值在 for...of 中应为响应式', () => {
    const set = reactive(new Set<object>([{ id: 1 }]))
    const first = [...set][0]
    expect(isReactive(first)).toBe(true)
  })

  test('使用代理对象 delete/has 可以命中原始对象', () => {
    const raw = { id: 1 }
    const set = reactive(new Set<object>([raw]))
    const proxyValue = [...set][0]
    expect(set.has(proxyValue)).toBe(true)
    expect(set.delete(proxyValue)).toBe(true)
    expect(set.has(raw)).toBe(false)
  })
})

