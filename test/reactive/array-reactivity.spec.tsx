import { flushReactiveEffectsSync, reactive, watchEffect } from '@viewfly/core'

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

describe('响应式数组：直接下标与 length 写入', () => {
  test('直接修改下标会触发该下标依赖', () => {
    const arr = reactive([1, 2, 3])
    const c = createCounter(() => {
      arr[1]
    })
    c.reset()
    arr[1] = 20
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('给下标赋相同值不会重复触发', () => {
    const arr = reactive([1, 2, 3])
    const c = createCounter(() => {
      arr[1]
    })
    c.reset()
    arr[1] = 2
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('给下标赋 NaN 相同值不会重复触发', () => {
    const arr = reactive([Number.NaN])
    const c = createCounter(() => {
      arr[0]
    })
    c.reset()
    arr[0] = Number.NaN
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('设置越界下标会触发 length 依赖', () => {
    const arr = reactive([1, 2, 3])
    const c = createCounter(() => {
      arr.length
    })
    c.reset()
    arr[5] = 100
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('缩小 length 会触发被截断下标依赖', () => {
    const arr = reactive([1, 2, 3, 4])
    const c = createCounter(() => {
      arr[3]
    })
    c.reset()
    arr.length = 2
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('增大 length 会触发 length 依赖', () => {
    const arr = reactive([1, 2, 3])
    const c = createCounter(() => {
      arr.length
    })
    c.reset()
    arr.length = 10
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('delete 下标不改变 length，但会触发该下标依赖', () => {
    const arr = reactive([1, 2, 3])
    const lengthCounter = createCounter(() => {
      arr.length
    })
    const indexCounter = createCounter(() => {
      arr[1]
    })
    lengthCounter.reset()
    indexCounter.reset()
    delete arr[1]
    expect(arr.length).toBe(3)
    expect(indexCounter.value()).toBe(1)
    expect(lengthCounter.value()).toBe(0)
    indexCounter.stop()
    lengthCounter.stop()
  })

  test('delete 不存在下标不会误触发依赖', () => {
    const arr = reactive([1, 2, 3])
    const indexCounter = createCounter(() => {
      arr[1]
    })
    const hasCounter = createCounter(() => {
      1 in arr
    })
    indexCounter.reset()
    hasCounter.reset()
    delete arr[10]
    expect(indexCounter.value()).toBe(0)
    expect(hasCounter.value()).toBe(0)
    hasCounter.stop()
    indexCounter.stop()
  })
})

describe('响应式数组：变异方法', () => {
  test('push 会触发 length 和新下标依赖', () => {
    const arr = reactive([1, 2])
    const lengthCounter = createCounter(() => {
      arr.length
    })
    const tailCounter = createCounter(() => {
      arr[2]
    })
    lengthCounter.reset()
    tailCounter.reset()
    arr.push(3)
    expect(lengthCounter.value()).toBe(1)
    expect(tailCounter.value()).toBe(1)
    tailCounter.stop()
    lengthCounter.stop()
  })

  test('pop 会触发 length 和尾部下标依赖', () => {
    const arr = reactive([1, 2, 3])
    const lengthCounter = createCounter(() => {
      arr.length
    })
    const tailCounter = createCounter(() => {
      arr[2]
    })
    lengthCounter.reset()
    tailCounter.reset()
    arr.pop()
    expect(lengthCounter.value()).toBe(1)
    expect(tailCounter.value()).toBe(1)
    tailCounter.stop()
    lengthCounter.stop()
  })

  test('shift 会触发受影响下标和 length 依赖', () => {
    const arr = reactive([1, 2, 3])
    const headCounter = createCounter(() => {
      arr[0]
    })
    const secondCounter = createCounter(() => {
      arr[1]
    })
    const lengthCounter = createCounter(() => {
      arr.length
    })
    headCounter.reset()
    secondCounter.reset()
    lengthCounter.reset()
    arr.shift()
    expect(headCounter.value()).toBe(1)
    expect(secondCounter.value()).toBe(1)
    expect(lengthCounter.value()).toBe(1)
    lengthCounter.stop()
    secondCounter.stop()
    headCounter.stop()
  })

  test('unshift 会触发位移下标和 length 依赖', () => {
    const arr = reactive([2, 3])
    const headCounter = createCounter(() => {
      arr[0]
    })
    const secondCounter = createCounter(() => {
      arr[1]
    })
    const lengthCounter = createCounter(() => {
      arr.length
    })
    headCounter.reset()
    secondCounter.reset()
    lengthCounter.reset()
    arr.unshift(1)
    expect(headCounter.value()).toBe(1)
    expect(secondCounter.value()).toBe(1)
    expect(lengthCounter.value()).toBe(1)
    lengthCounter.stop()
    secondCounter.stop()
    headCounter.stop()
  })

  test('splice 删除会触发受影响下标和 length 依赖', () => {
    const arr = reactive([1, 2, 3, 4])
    const indexCounter = createCounter(() => {
      arr[2]
    })
    const lengthCounter = createCounter(() => {
      arr.length
    })
    indexCounter.reset()
    lengthCounter.reset()
    arr.splice(1, 2)
    expect(indexCounter.value()).toBe(1)
    expect(lengthCounter.value()).toBe(1)
    lengthCounter.stop()
    indexCounter.stop()
  })

  test('splice 插入会触发 length 和尾部下标依赖', () => {
    const arr = reactive([1, 4])
    const indexCounter = createCounter(() => {
      arr[3]
    })
    const lengthCounter = createCounter(() => {
      arr.length
    })
    indexCounter.reset()
    lengthCounter.reset()
    arr.splice(1, 0, 2, 3)
    expect(indexCounter.value()).toBe(1)
    expect(lengthCounter.value()).toBe(1)
    lengthCounter.stop()
    indexCounter.stop()
  })
})

describe('响应式数组：读取与迭代依赖', () => {
  test('for...of 迭代依赖会在 push 后更新', () => {
    const arr = reactive([1, 2])
    const c = createCounter(() => {
      let sum = 0
      for (const i of arr) {
        sum += i
      }
      sum
    })
    c.reset()
    arr.push(3)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('join 依赖会在 splice 后更新', () => {
    const arr = reactive([1, 2, 3])
    const c = createCounter(() => {
      arr.join(',')
    })
    c.reset()
    arr.splice(1, 1)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('includes 依赖会在目标元素被加入后更新', () => {
    const arr = reactive([1, 2])
    const c = createCounter(() => {
      arr.includes(3)
    })
    c.reset()
    arr.push(3)
    expect(c.value()).toBe(1)
    c.stop()
  })

  test('map/filter/reduce 依赖会在 shift 后更新', () => {
    const arr = reactive([1, 2, 3])
    const mapCounter = createCounter(() => {
      arr.map(i => i * 2)
    })
    const filterCounter = createCounter(() => {
      arr.filter(i => i > 1)
    })
    const reduceCounter = createCounter(() => {
      arr.reduce((a, b) => a + b, 0)
    })
    mapCounter.reset()
    filterCounter.reset()
    reduceCounter.reset()
    arr.shift()
    expect(mapCounter.value()).toBe(1)
    expect(filterCounter.value()).toBe(1)
    expect(reduceCounter.value()).toBe(1)
    reduceCounter.stop()
    filterCounter.stop()
    mapCounter.stop()
  })

  test('数组回调方法支持 thisArg 绑定', () => {
    const arr = reactive([1, 2, 3])
    const ctx = { sum: 0, threshold: 2 }
    arr.forEach(function (this: typeof ctx, value) {
      this.sum += value as number
    }, ctx)
    const mapped = arr.map(function (this: typeof ctx, value) {
      return (value as number) + this.threshold
    }, ctx)
    const filtered = arr.filter(function (this: typeof ctx, value) {
      return (value as number) >= this.threshold
    }, ctx)
    const some = arr.some(function (this: typeof ctx, value) {
      return (value as number) > this.threshold
    }, ctx)
    const every = arr.every(function (this: typeof ctx, value) {
      return (value as number) <= this.threshold + 1
    }, ctx)
    expect(ctx.sum).toBe(6)
    expect(mapped).toEqual([3, 4, 5])
    expect(filtered).toEqual([2, 3])
    expect(some).toBe(true)
    expect(every).toBe(true)
  })

  test('数组回调第三参数应为响应式数组', () => {
    const arr = reactive([1, 2, 3])
    let mapArrayArg: unknown[] | null = null
    let filterArrayArg: unknown[] | null = null
    arr.map((_, __, array) => {
      mapArrayArg = array
      return 0
    })
    arr.filter((_, __, array) => {
      filterArrayArg = array
      return true
    })
    expect(mapArrayArg).toBe(arr)
    expect(filterArrayArg).toBe(arr)
  })
})

describe('响应式数组：非变异方法', () => {
  test('仅调用 toReversed 不应触发更新', () => {
    const arr = reactive([1, 2, 3])
    const c = createCounter(() => {
      arr[0]
    })
    c.reset()
    arr.toReversed()
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('toSorted 不应修改原数组', () => {
    const arr = reactive([3, 1, 2])
    const c = createCounter(() => {
      arr.join(',')
    })
    c.reset()
    const sorted = arr.toSorted((a, b) => (a as number) - (b as number))
    expect(sorted).toEqual([1, 2, 3])
    expect(arr).toEqual([3, 1, 2])
    expect(c.value()).toBe(0)
    c.stop()
  })

  test('toSpliced 不应修改原数组', () => {
    const arr = reactive([1, 2, 3])
    const c = createCounter(() => {
      arr.join(',')
    })
    c.reset()
    const next = arr.toSpliced(1, 1, 20)
    expect(next).toEqual([1, 20, 3])
    expect(arr).toEqual([1, 2, 3])
    expect(c.value()).toBe(0)
    c.stop()
  })
})

describe('响应式数组：边界与语义检查', () => {
  test('缩小 length 后高位下标应变为 undefined', () => {
    const arr = reactive([1, 2, 3, 4])
    arr.length = 2
    expect(arr[2]).toBeUndefined()
    expect(arr[3]).toBeUndefined()
    expect(arr.length).toBe(2)
  })

  test('delete 后稀疏数组空洞访问语义保持稳定', () => {
    const arr = reactive([1, 2, 3])
    delete arr[1]
    expect(1 in arr).toBe(false)
    expect(arr[1]).toBeUndefined()
    expect(arr.length).toBe(3)
  })

  test('尾部越界下标赋值会创建空洞并更新 length', () => {
    const arr = reactive([1])
    arr[3] = 4
    expect(arr.length).toBe(4)
    expect(arr[1]).toBeUndefined()
    expect(arr[2]).toBeUndefined()
    expect(arr[3]).toBe(4)
  })
})
