import 'reflect-metadata'
import { Injectable, InjectFlags, NullInjector } from '@viewfly/core'

describe('NullInjector', () => {
  test('确何获取值时，抛出异常', () => {
    const injector = new NullInjector()

    @Injectable()
    class A {
    }

    expect(() => {
      injector.get(A)
    }).toThrow()
  })


  test('有默认值时，返回默认值', () => {
    const injector = new NullInjector()

    @Injectable()
    class A {
    }

    const obj = {}

    expect(injector.get(A, InjectFlags.Default, obj)).toStrictEqual(obj)
  })

  test('默认行为', () => {
    const injector = new NullInjector()

    function errMsg(token: any) {
      return `No provide for \`${token}\`!`
    }

    expect(() => {
      injector.get('xxx')
    }).toThrow(errMsg('xxx'))
    expect(() => injector.get({ name: 'xxx' })).toThrow(errMsg('xxx'))
    expect(() => injector.get({ token: 'xxx' })).toThrow(errMsg('xxx'))
    expect(() => injector.get(null)).toThrow(errMsg('null'))
    expect(() => injector.get([1, 2])).toThrow(errMsg('[1, 2]'))
    expect(() => injector.get({
      toString() {
        return null
      }
    })).toThrow(errMsg('null'))
    expect(() => injector.get({
      toString() {
        return 'xxx'
      }
    })).toThrow(errMsg('xxx'))
    expect(() => injector.get({
      toString() {
        return 'aaa\nbbb'
      }
    })).toThrow(errMsg('aaa'))
  })
})
