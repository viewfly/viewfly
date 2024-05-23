import { makeParamDecorator, makePropertyDecorator } from './utils/decorators'
import { AbstractType, Type } from './type'
import { ExtractValueType, InjectFlags, Injector } from './injector'
import { InjectionToken } from './injection-token'
import { ForwardRef } from './forward-ref'
import { THROW_IF_NOT_FOUND } from './null-injector'

export interface Inject {
  token: InjectionToken<any> | Type<any> | ForwardRef<InjectionToken<any> | Type<any>>
}

export interface InjectDecorator {
  (token: InjectionToken<any> | Type<any> | ForwardRef<InjectionToken<any> | Type<any>>): ParameterDecorator

  new(token: InjectionToken<any> | Type<any> | ForwardRef<InjectionToken<any> | Type<any>>): Inject
}

/**
 * 构造函数参数装饰器，用于改变注入 token
 */
export const Inject: InjectDecorator = function InjectDecorator(
  this: any,
  token: InjectionToken<any> | Type<any> | ForwardRef<InjectionToken<any> | Type<any>>) {
  if (this instanceof Inject) {
    this.token = token
  } else {
    return makeParamDecorator(Inject, new Inject(token))
  }
} as InjectDecorator

export interface Self {
}

export interface SelfDecorator {
  (): ParameterDecorator

  new(): Self
}

export const Self: SelfDecorator = function SelfDecorator(this: any) {
  if (!(this instanceof Self)) {
    return makeParamDecorator(Self, new Self())
  }
} as SelfDecorator

export interface SkipSelf {
}

export interface SkipSelfDecorator {
  (): ParameterDecorator

  new(): SkipSelf
}

export const SkipSelf: SkipSelfDecorator = function SkipSelfDecorator(this: any) {
  if (!(this instanceof SkipSelf)) {
    return makeParamDecorator(SkipSelf, new SkipSelf())
  }
} as SkipSelfDecorator

export interface Optional {
}

export interface OptionalDecorator {
  (): ParameterDecorator

  new(): Optional
}

export const Optional: OptionalDecorator = function OptionalDecorator(this: any) {
  if (!(this instanceof Optional)) {
    return makeParamDecorator(Optional, new Optional())
  }
} as OptionalDecorator

// export interface TypeDecorator {
//   <T extends Type<any>>(type: T): T
//
//   (target: unknown, propertyKey?: string | symbol, parameterIndex?: number): void
// }

export interface Prop {
}

export interface PropDecorator {
  <T extends Type<any> | AbstractType<any> | InjectionToken<any>, U = never>(
    token?: T | ForwardRef<ExtractValueType<T>>,
    notFoundValue?: U,
    flags?: InjectFlags
  ): PropertyDecorator

  new(token: any): Prop
}

export const Prop: PropDecorator = function PropDecorator<T extends Type<any> | AbstractType<any> | InjectionToken<any>, U = never>(
  this: any,
  token?: T | ForwardRef<ExtractValueType<T>>,
  notFoundValue?: U,
  flags?: InjectFlags,
) {
  if (!(this instanceof Prop)) {
    return makePropertyDecorator(Prop, token, function (instance: any, propertyName: string | symbol, token: any, injector: Injector) {
      instance[propertyName] = injector.get(token instanceof ForwardRef ? token.getRef() : token, notFoundValue, flags)
    })
  }
} as PropDecorator
