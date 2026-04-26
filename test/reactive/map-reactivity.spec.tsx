import { flushReactiveEffectsSync, isReactive, reactive, watchEffect } from '@viewfly/core'

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
      flushReactiveEffectsSync()
      return count
    },
    stop
  }
}

describe('响应式 Map：基础语义', () => {
  test('reactive(Map) 返回响应式对象', () => {
    const map = reactive(new Map<string, number>())
    expect(isReactive(map)).toBe(true)
  })

  test('set/get 基本可用', () => {
    const map = reactive(new Map<string, number>())
    map.set('a', 1)
    expect(map.get('a')).toBe(1)
  })

  test('delete 返回值与原生一致', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    expect(map.delete('a')).toBe(true)
    expect(map.delete('a')).toBe(false)
  })

  test('clear 会清空所有项', () => {
    const map = reactive(new Map<string, number>([['a', 1], ['b', 2]]))
    map.clear()
    expect(map.size).toBe(0)
    expect(map.get('a')).toBeUndefined()
    expect(map.get('b')).toBeUndefined()
  })
})

describe('响应式 Map：按 key 的依赖', () => {
  test('get(key) 依赖会在 set 同 key 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      map.get('a')
    })
    c.reset()
    map.set('a', 2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('get(key) 依赖在 set 相同值时不应更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      map.get('a')
    })
    c.reset()
    map.set('a', 1)
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('get(key) 依赖不会被其它 key 的 set 误触发', () => {
    const map = reactive(new Map<string, number>([['a', 1], ['b', 2]]))
    const c = createCounter(() => {
      map.get('a')
    })
    c.reset()
    map.set('b', 3)
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('get(key) 依赖会在 delete 同 key 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      map.get('a')
    })
    c.reset()
    map.delete('a')
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('has(key) 依赖会在对应 key 增删时更新', () => {
    const map = reactive(new Map<string, number>())
    const c = createCounter(() => {
      map.has('a')
    })
    c.reset()
    map.set('a', 1)
    expect(c.value()).toBe(1)
    c.reset()
    map.delete('a')
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('get/has 依赖会在 clear 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const getCounter = createCounter(() => {
      map.get('a')
    })
    const hasCounter = createCounter(() => {
      map.has('a')
    })
    getCounter.reset()
    hasCounter.reset()
    map.clear()
    expect(getCounter.value()).toBe(1)
    expect(hasCounter.value()).toBe(1)
    hasCounter.stop()
    getCounter.stop()
  })
})

describe('响应式 Map：size 依赖', () => {
  test('size 依赖会在新增 key 时更新', () => {
    const map = reactive(new Map<string, number>())
    const c = createCounter(() => {
      map.size
    })
    c.reset()
    map.set('a', 1)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('size 依赖在仅更新已有 key 的值时不应更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      map.size
    })
    c.reset()
    map.set('a', 2)
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('size 依赖会在 delete 成功时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      map.size
    })
    c.reset()
    map.delete('a')
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('size 依赖在 delete 不存在 key 时不应更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      map.size
    })
    c.reset()
    map.delete('x')
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('size 依赖会在 clear 非空 map 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1], ['b', 2]]))
    const c = createCounter(() => {
      map.size
    })
    c.reset()
    map.clear()
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('size 依赖在 clear 空 map 时不应更新', () => {
    const map = reactive(new Map<string, number>())
    const c = createCounter(() => {
      map.size
    })
    c.reset()
    map.clear()
    expect(c.value()).toBe(0)
    c.stop()
  })
})

describe('响应式 Map：迭代相关依赖', () => {
  test('for...of 依赖会在新增 key 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      const out: string[] = []
      for (const [k, v] of map) {
        out.push(`${k}:${v}`)
      }
      out.join(',')
    })
    c.reset()
    map.set('b', 2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('keys() 依赖会在新增 key 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      [...map.keys()]
    })
    c.reset()
    map.set('b', 2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('values() 依赖会在新增 key 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1]]))
    const c = createCounter(() => {
      [...map.values()]
    })
    c.reset()
    map.set('b', 2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('entries() 依赖会在删除 key 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1], ['b', 2]]))
    const c = createCounter(() => {
      [...map.entries()]
    })
    c.reset()
    map.delete('b')
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('forEach 依赖会在 clear 时更新', () => {
    const map = reactive(new Map<string, number>([['a', 1], ['b', 2]]))
    const c = createCounter(() => {
      let sum = 0
      map.forEach(v => {
        sum += v
      })
      sum
    })
    c.reset()
    map.clear()
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('forEach 支持 thisArg 绑定', () => {
    const map = reactive(new Map<string, number>([['a', 1], ['b', 2]]))
    const ctx = { sum: 0 }
    map.forEach(function (this: typeof ctx, value) {
      this.sum += value
    }, ctx)
    expect(ctx.sum).toBe(3)
  })
})

describe('响应式 Map：对象 key / value 的代理行为', () => {
  test('对象 value 通过 get 取出后应为响应式', () => {
    const rawValue = { count: 1 }
    const map = reactive(new Map<string, { count: number }>([['a', rawValue]]))
    const value = map.get('a')!
    expect(isReactive(value)).toBe(true)
  })

  test('对象 key 在 keys() 迭代中应为响应式', () => {
    const rawKey = { id: 1 }
    const map = reactive(new Map<object, string>([[rawKey, 'v']]))
    const firstKey = [...map.keys()][0]
    expect(isReactive(firstKey)).toBe(true)
  })

  test('使用代理 key 调用 get/has 可以命中原始 key', () => {
    const rawKey = { id: 1 }
    const map = reactive(new Map<object, string>([[rawKey, 'v']]))
    const proxyKey = [...map.keys()][0]
    expect(map.get(proxyKey)).toBe('v')
    expect(map.has(proxyKey)).toBe(true)
  })
})

describe('响应式 WeakMap：基础与依赖', () => {
  test('reactive(WeakMap) 返回响应式对象', () => {
    const wm = reactive(new WeakMap<object, { count: number }>())
    expect(isReactive(wm)).toBe(true)
  })

  test('set/get/has/delete 基本语义正确', () => {
    const wm = reactive(new WeakMap<object, number>())
    const key = {}
    wm.set(key, 1)
    expect(wm.get(key)).toBe(1)
    expect(wm.has(key)).toBe(true)
    expect(wm.delete(key)).toBe(true)
    expect(wm.has(key)).toBe(false)
    expect(wm.delete(key)).toBe(false)
  })

  test('get(key) 依赖会在 set 同 key 时更新', () => {
    const key = {}
    const wm = reactive(new WeakMap<object, number>([[key, 1]]))
    const c = createCounter(() => {
      wm.get(key)
    })
    c.reset()
    wm.set(key, 2)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('has(key) 依赖会在 delete 同 key 时更新', () => {
    const key = {}
    const wm = reactive(new WeakMap<object, number>([[key, 1]]))
    const c = createCounter(() => {
      wm.has(key)
    })
    c.reset()
    wm.delete(key)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('set 其它 key 不应误触发当前 key 的 get 依赖', () => {
    const k1 = {}
    const k2 = {}
    const wm = reactive(new WeakMap<object, number>([[k1, 1], [k2, 2]]))
    const c = createCounter(() => {
      wm.get(k1)
    })
    c.reset()
    wm.set(k2, 3)
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('对象 value 通过 get 取出后应为响应式', () => {
    const key = {}
    const wm = reactive(new WeakMap<object, { nested: number }>([[key, { nested: 1 }]]))
    const value = wm.get(key)!
    expect(isReactive(value)).toBe(true)
  })
})
