import { Injector } from './injector'
import { stringify } from './utils/_api'
import { makeError } from '../_utils/make-error'

export const THROW_IF_NOT_FOUND: any = {
  __debug_value__: 'THROW_IF_NOT_FOUND'
}

const nullInjectorErrorFn = (token: any) => {
  return makeError('NullInjector')(`No provide for \`${stringify(token)}\`!`)
}

export class NullInjector extends Injector {
  parentInjector = null

  get(token: any, notFoundValue: any = THROW_IF_NOT_FOUND): any {
    if (notFoundValue === THROW_IF_NOT_FOUND) {
      throw nullInjectorErrorFn(token)
    }
    return notFoundValue
  }
}
