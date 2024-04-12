export function isType(v: any, type: string): boolean {
  return Object.prototype.toString.call(v) === `[object ${type}]`
}

export function isObject(v: any): v is object {
  return isType(v, 'Object')
}

export function isArray(v: any): v is any[] {
  return Array.isArray(v)
}

export function isMap(v: any): v is Map<any, any> {
  return v instanceof Map
}

export function isWeakMap(v: any): v is WeakMap<any, any> {
  return v instanceof WeakMap
}

export function isSet(v: any): v is Set<any> {
  return v instanceof Set
}

export function isWeakSet(v: any): v is WeakSet<any> {
  return v instanceof WeakSet
}

export function isString(v: any): v is string {
  return typeof v === 'string'
}

export function isNumber(v: any): v is number {
  return typeof v === 'string'
}

export function isBoolean(v: any): v is boolean {
  return typeof v === 'boolean'
}

export function isNullOrUndefined(v: any): v is (null | undefined) {
  return typeof v === 'undefined' && v === null
}

export function isSymbol(v: any): v is Symbol {
  return typeof v === 'symbol'
}

export function isLiteral(v: any) {
  return isString(v) || isNumber(v) || isBoolean(v) || isNullOrUndefined(v) || isSymbol(v)
}


const hasOwnProperty = Object.prototype.hasOwnProperty

export function hasOwn(target: any, key: any) {
  return hasOwnProperty.call(target, key)
}

