import { toRaw } from './reactive'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './effect'
import { createIterableIterator } from './iterable-iterator'


function applyPredicateMethod(self: any,
                              methodName: string,
                              predicate: Function,
                              wrapper: (v: unknown) => unknown,
                              thisArg?: any) {
  const target = toRaw(self)
  track(target, TrackOpTypes.Iterate)
  return target[methodName]((value: unknown, index: number) => {
    return predicate.call(thisArg, wrapper(value), index, self)
  }, thisArg)
}

function applySearchMethod(self: any, methodName: string, args: unknown[]) {
  const target = toRaw(self)
  track(target, TrackOpTypes.Iterate)
  return target[methodName](...args.map(toRaw))
}

export function triggerArrayByRange(target: unknown[], startIndex: number, endIndex: number) {
  for (; startIndex < endIndex; startIndex++) {
    trigger(target, TriggerOpTypes.Set, startIndex + '')
  }
}

export function createArrayHandlers(wrapper: (v: unknown) => unknown) {
  return {
    concat(this: any, ...items: any[]): any[] {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.concat(...items)
    },
    every(this: any,
          predicate: (value: unknown, index: number, array: unknown[]) => unknown,
          thisArg?: unknown) {
      return applyPredicateMethod(this, 'every', predicate, wrapper, thisArg)
    },
    filter(this: any, predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any) {
      return applyPredicateMethod(this, 'filter', predicate, wrapper, thisArg)
    },
    find(predicate: (value: unknown, index: number, obj: unknown[]) => unknown, thisArg?: any) {
      return applyPredicateMethod(this, 'find', predicate, wrapper, thisArg)
    },
    findIndex(predicate: (value: unknown, index: number, obj: unknown[]) => unknown, thisArg?: any): number {
      return applyPredicateMethod(this, 'findIndex', predicate, wrapper, thisArg)
    },
    findLast(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any) {
      return applyPredicateMethod(this, 'findLast', predicate, wrapper, thisArg)
    },
    findLastIndex(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any): number {
      return applyPredicateMethod(this, 'findLastIndex', predicate, wrapper, thisArg)
    },
    forEach(callbackfn: (value: unknown, index: number, array: unknown[]) => void, thisArg?: any) {
      return applyPredicateMethod(this, 'forEach', callbackfn, wrapper, thisArg)
    },
    includes(...args: unknown[]): boolean {
      return applySearchMethod(this, 'includes', args)
    },
    indexOf(...args: unknown[]): number {
      return applySearchMethod(this, 'indexOf', args)
    },
    join(separator?: string): string {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.join(separator)
    },
    lastIndexOf(...args: unknown[]): number {
      return applySearchMethod(this, 'lastIndexOf', args)
    },
    map<U>(callbackFn: (value: unknown, index: number, array: unknown[]) => U, thisArg?: any): U[] {
      return applyPredicateMethod(this, 'map', callbackFn, wrapper, thisArg)
    },
    pop(): any {
      const target = toRaw(this) as unknown[]
      const oldLength = target.length
      const value = target.pop()
      const newLength = target.length
      if (newLength < oldLength) {
        trigger(target, TriggerOpTypes.Set, newLength + '')
        trigger(target, TriggerOpTypes.Set, 'length')
        trigger(target, TriggerOpTypes.Iterate)
      }
      return value
    },
    push(this: any, ...items: any[]) {
      const target = toRaw(this) as unknown[]
      const oldLength = target.length
      const length = target.push(...items)
      triggerArrayByRange(target, oldLength, length)
      trigger(target, TriggerOpTypes.Iterate)
      return length
    },
    reduce(
      callbackFn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown,
      ...args: any[]): any {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.reduce((p: unknown, c: unknown, i: number, a: unknown[]) => {
        if (args.length > 0) {
          return callbackFn(p, wrapper(c), i, a)
        }
        return callbackFn(wrapper(p), wrapper(c), i, a)
      }, ...args)
    },
    reduceRight(
      callbackFn: (previousValue: unknown, currentValue: unknown, currentIndex: number, array: unknown[]) => unknown,
      ...args: any[]): any {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.reduceRight((p: unknown, c: unknown, i: number, a: unknown[]) => {
        if (args.length > 0) {
          return callbackFn(p, wrapper(c), i, a)
        }
        return callbackFn(wrapper(p), wrapper(c), i, a)
      }, ...args)
    },
    shift(): any {
      const target = toRaw(this) as unknown[]
      const oldLength = target.length
      const value = target.shift()
      const newLength = target.length
      if (newLength < oldLength) {
        triggerArrayByRange(target, 0, oldLength)
        trigger(target, TriggerOpTypes.Set, 'length')
        trigger(target, TriggerOpTypes.Iterate)
      }
      return value
    },
    some(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any): boolean {
      return applyPredicateMethod(this, 'some', predicate, wrapper, thisArg)
    },
    splice(start: number, ...items: any[]) {
      const target = toRaw(this) as unknown[]
      const oldLength = target.length
      const deleted = target.splice(start, ...items).map(i => wrapper(i))
      const newLength = target.length
      triggerArrayByRange(target, start, Math.max(oldLength, newLength))
      if (oldLength !== newLength) {
        trigger(target, TriggerOpTypes.Set, 'length')
      }
      trigger(target, TriggerOpTypes.Iterate)
      return deleted
    },
    toReversed(): any {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.toReversed()
    },
    toSorted(compareFn?: (a: unknown, b: unknown) => number): any {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.toSorted(compareFn)
    },
    toSpliced(start: number, deleteCount: number, ...items: any[]): any {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.toSpliced(start, deleteCount, ...items)
    },
    unshift(...items: any[]): number {
      const target = toRaw(this) as unknown[]
      const length = target.unshift(...items)
      triggerArrayByRange(target, 0, length)
      trigger(target, TriggerOpTypes.Set, 'length')
      trigger(target, TriggerOpTypes.Iterate)
      return length
    },
    [Symbol.iterator]() {
      return this.values()
    },
    ...createIterableIterator(wrapper)
  }
}
