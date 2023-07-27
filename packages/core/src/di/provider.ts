import { AbstractType, Type } from './type'
import { InjectionToken } from './injection-token'

export interface ClassProvider<T = any> {
  provide: Type<T> | AbstractType<T> | InjectionToken<T>
  useClass: Type<T>
  deps?: any[]
}

export interface FactoryProvider<T = any> {
  provide: Type<T> | AbstractType<T> | InjectionToken<T>
  useFactory: (...args: any[]) => T
  deps?: any[]
}

export interface ValueProvider<T = any> {
  provide: Type<T> | AbstractType<T> | InjectionToken<T>
  useValue: T
}

export interface ExistingProvider<T = any> {
  provide: Type<T> | AbstractType<T> | InjectionToken<T>
  useExisting: T
}

export interface ConstructorProvider<T = any> {
  provide: Type<T>
  deps?: []
}

export interface TypeProvider<T = any> extends Type<T> {
}

export interface AbstractProvider<T = any> extends AbstractType<T> {
}

export type StaticProvider<T = any> =
  ClassProvider<T>
  | FactoryProvider<T>
  | ValueProvider<T>
  | ExistingProvider<T>
  | ConstructorProvider<T>
export type Provider<T = any> = TypeProvider<T> | AbstractProvider<T> | StaticProvider<T>
