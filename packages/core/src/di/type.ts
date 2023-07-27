export const Type = Function

export interface Type<T> extends Function {
  new(...args: any[]): T
}

export interface AbstractType<T> extends Function {
  prototype: T
}
