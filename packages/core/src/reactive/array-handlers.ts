import { toRaw } from './reactive'
import { track, TrackOpTypes, trigger, TriggerOpTypes } from './dep'
import { createIterableIterator } from './iterable-iterator'


function applyPredicateMethod(self: any,
                              methodName: string,
                              predicate: Function,
                              wrapper: (v: unknown) => unknown,
                              thisArg?: any) {
  const target = toRaw(self)
  track(target, TrackOpTypes.Iterate)
  return target[methodName]((value: unknown, index: number, array: unknown[]) => {
    return predicate.call(target, wrapper(value), index, array)
  }, thisArg)
}

function applySearchMethod(self: any, methodName: string, searchElement: unknown, fromIndex?: number) {
  const target = toRaw(self)
  track(target, TrackOpTypes.Iterate)
  return target[methodName](searchElement, fromIndex)
}

export function createArrayHandlers(wrapper: (v: unknown) => unknown) {
  return {
    concat(this: any, ...items: any[]): any[] {
      const target = toRaw(this)
      trigger(target, TriggerOpTypes.Add)
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
    includes(searchElement: unknown, fromIndex?: number): boolean {
      return applySearchMethod(this, 'includes', searchElement, fromIndex)
    },
    indexOf(searchElement: unknown, fromIndex?: number): number {
      return applySearchMethod(this, 'indexOf', searchElement, fromIndex)
    },
    join(separator?: string): string {
      const target = toRaw(this)
      track(target, TrackOpTypes.Iterate)
      return target.join(separator)
    },
    lastIndexOf(searchElement: unknown, fromIndex?: number): number {
      return applySearchMethod(this, 'lastIndexOf', searchElement, fromIndex)
    },
    map<U>(callbackFn: (value: unknown, index: number, array: unknown[]) => U, thisArg?: any): U[] {
      return applyPredicateMethod(this, 'map', callbackFn, wrapper, thisArg)
    },
    pop(): any {
      const target = toRaw(this)
      trigger(target, TriggerOpTypes.Delete)
      return target.pop()
    },
    push(this: any, ...items: any[]) {
      const target = toRaw(this)
      trigger(target, TriggerOpTypes.Add)
      return target.push(...items)
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
      const target = toRaw(this)
      trigger(target, TriggerOpTypes.Delete)
      return target.shift()
    },
    some(predicate: (value: unknown, index: number, array: unknown[]) => unknown, thisArg?: any): boolean {
      return applyPredicateMethod(this, 'some', predicate, thisArg)
    },
    splice(start: number, deleteCount?: number) {
      const target = toRaw(this) as unknown[]
      trigger(target, TriggerOpTypes.Set)
      trigger(target, TriggerOpTypes.Add)
      trigger(target, TriggerOpTypes.Delete)
      return target.splice(start, deleteCount).map(i => wrapper(i))
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
      const target = toRaw(this)
      trigger(target, TriggerOpTypes.Add)
      return target.unshift(...items)
    },
    [Symbol.iterator]() {
      return this.values()
    },
    ...createIterableIterator(wrapper)
  }
}
