import 'reflect-metadata'
import {
  forwardRef,
  Inject,
  Injectable,
  InjectFlags,
  InjectionToken,
  NullInjector,
  Optional,
  Prop,
  ReflectiveInjector,
  Scope,
  Self,
  SkipSelf,
  THROW_IF_NOT_FOUND,
  Type
} from '@viewfly/core'

describe('默认行为', () => {
  test('确何获取值时，抛出异常', () => {
    const injector = new ReflectiveInjector(null, [])

    @Injectable()
    class A {
    }

    expect(() => {
      injector.get(A)
    }).toThrow()
  })


  test('有默认值时，返回默认值', () => {
    const injector = new ReflectiveInjector(null, [])

    @Injectable()
    class A {
    }

    const obj = {}

    expect(injector.get(A, InjectFlags.Default, obj)).toStrictEqual(obj)
  })
})

describe('ReflectiveInjector', () => {
  const valueProvide = {}
  const valueInjectionToken = new InjectionToken('')

  test('value provide', () => {
    const injector = new ReflectiveInjector(null, [{
      provide: valueInjectionToken,
      useValue: valueProvide
    }])
    expect(injector.get(valueInjectionToken)).toBe(valueProvide)
  })

  test('factory provide', () => {
    const injector = new ReflectiveInjector(null, [{
      provide: valueInjectionToken,
      useFactory() {
        return valueProvide
      }
    }])

    expect(injector.get(valueInjectionToken)).toBe(valueProvide)
  })

  test('existing provide', () => {
    const token2 = new InjectionToken('')
    const injector = new ReflectiveInjector(null, [{
      provide: valueInjectionToken,
      useValue: valueProvide
    }, {
      provide: token2,
      useExisting: valueInjectionToken
    }])
    expect(injector.get(token2)).toBe(injector.get(valueInjectionToken))
    expect(injector.get(token2)).toBe(valueProvide)
  })

  test('construct provide', () => {
    @Injectable()
    class Klass {
    }

    const injector = new ReflectiveInjector(null, [Klass])
    expect(injector.get(Klass) instanceof Klass).toBeTruthy()
  })

  test('construct provide', () => {
    @Injectable()
    class Klass {
    }

    const injector = new ReflectiveInjector(null, [{ provide: Klass }])
    expect(injector.get(Klass) instanceof Klass).toBeTruthy()
  })

  test('class provide', () => {
    @Injectable()
    class A {

    }

    @Injectable()
    class B {

    }

    const injector = new ReflectiveInjector(null, [B, {
      provide: A,
      useClass: B
    }])

    expect(injector.get(A) instanceof B).toBeTruthy()
  })

  test('useExisting 共享实例', () => {
    @Injectable()
    class A {

    }

    let i = 0

    @Injectable()
    class B {
      constructor() {
        i++
      }
    }

    const injector = new ReflectiveInjector(null, [B, {
      provide: A,
      useExisting: B
    }])

    injector.get(B)
    injector.get(A)

    expect(i).toBe(1)
  })
  test('useExisting 共享实例', () => {
    @Injectable()
    class A {

    }

    let i = 0

    @Injectable()
    class B {
      constructor() {
        i++
      }
    }

    const injector = new ReflectiveInjector(null, [B, {
      provide: A,
      useExisting: B
    }])

    injector.get(A)
    injector.get(B)

    expect(i).toBe(1)
  })
  test('useClass 分别产生实例', () => {
    @Injectable()
    class A {

    }

    let i = 0

    @Injectable()
    class B {
      constructor() {
        i++
      }
    }

    const injector = new ReflectiveInjector(null, [B, {
      provide: A,
      useClass: B
    }])

    injector.get(B)
    injector.get(A)

    expect(i).toBe(2)
  })
  test('useClass 分别产生实例', () => {
    @Injectable()
    class A {

    }

    let i = 0

    @Injectable()
    class B {
      constructor() {
        i++
      }
    }

    const injector = new ReflectiveInjector(null, [B, {
      provide: A,
      useClass: B
    }])

    injector.get(A)
    injector.get(B)

    expect(i).toBe(2)
  })
  test('useClass 获取多次只产生一个实例', () => {
    @Injectable()
    class A {

    }

    let i = 0

    @Injectable()
    class B {
      constructor() {
        i++
      }
    }

    const injector = new ReflectiveInjector(null, [B, {
      provide: A,
      useClass: B
    }])

    injector.get(B)
    injector.get(A)
    injector.get(B)
    injector.get(A)

    expect(injector.get(A) === injector.get(A)).toBeTruthy()
    expect(injector.get(B) === injector.get(B)).toBeTruthy()
    expect(injector.get(A) === injector.get(B)).toBeFalsy()
    expect(i).toBe(2)
  })
  test('useClass 获取多次只产生一个实例', () => {
    @Injectable()
    class A {

    }

    let i = 0

    @Injectable()
    class B {
      constructor() {
        i++
      }
    }

    const injector = new ReflectiveInjector(null, [B, {
      provide: A,
      useClass: B
    }])

    injector.get(A)
    injector.get(B)
    injector.get(A)
    injector.get(B)

    expect(injector.get(A) === injector.get(A)).toBeTruthy()
    expect(injector.get(B) === injector.get(B)).toBeTruthy()
    expect(injector.get(A) === injector.get(B)).toBeFalsy()
    expect(i).toBe(2)
  })
  test('单例', () => {
    @Injectable()
    class A {

    }

    @Injectable()
    class B {

    }

    const injector = new ReflectiveInjector(null, [A, B])

    expect(injector.get(A)).toBe(injector.get(A))
    expect(injector.get(B)).toBe(injector.get(B))
  })

  test('useValue 不再分析依赖', () => {
    @Injectable()
    class Test1 {

    }

    @Injectable()
    class Test2 {
      constructor(private test1: Test1) {
      }
    }

    const value = {
      name: 'name'
    }
    const injector = new ReflectiveInjector(null, [{
      provide: Test2,
      useValue: value
    }])

    expect(injector.get(Test2)).toBe(value)
  })
})

describe('行为测试', () => {
  test('依赖分析', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [A, B])
    expect(injector.get(B).a instanceof A).toBeTruthy()
    expect(injector.get(B).a === injector.get(A)).toBeTruthy()
  })

  test('改变指向', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class Test {

    }

    @Injectable()
    class B {
      constructor(@Inject(Test) public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [A, B, Test])
    expect(injector.get(B).a instanceof Test).toBeTruthy()
  })

  test('属性注入', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      @Prop()
      a!: A
      @Prop(forwardRef(() => A))
      b!: A
    }

    const injector = new ReflectiveInjector(null, [A, B])
    expect(injector.get(B).a instanceof A).toBeTruthy()
    expect(injector.get(B).a === injector.get(A)).toBeTruthy()


    expect(injector.get(B).b instanceof A).toBeTruthy()
    expect(injector.get(B).b === injector.get(A)).toBeTruthy()
  })


  test('可选属性注入', () => {
    const tryValue = {}

    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      @Prop(A, InjectFlags.Optional, tryValue)
      a!: A
      @Prop(forwardRef(() => A), InjectFlags.Optional, null)
      b!: A
    }

    const injector = new ReflectiveInjector(null, [B])

    expect(injector.get(B).a).toBe(tryValue)
    expect(injector.get(B).b).toBeNull()
  })

  test('向后引用', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@Inject(forwardRef(() => A)) public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [A, B])
    expect(injector.get(B).a instanceof A).toBeTruthy()
    expect(injector.get(B).a === injector.get(A)).toBeTruthy()
  })

  test('当依赖不存在时，抛出异常', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [B])

    expect(() => injector.get(B)).toThrow()
  })

  test('可选依赖', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@Optional() public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [B])
    expect(injector.get(B).a).toBeNull()
  })
  test('多级依赖', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [A])
    const injector = new ReflectiveInjector(rootInjector, [B])
    expect(injector.get(B).a instanceof A).toBeTruthy()
    expect(injector.get(B).a).toBe(rootInjector.get(A))
  })

  test('多级异步依赖', async () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [A])
    const injector = await new ReflectiveInjector(rootInjector, [B])
    expect(injector.get(B).a instanceof A).toBeTruthy()
    expect(injector.get(B).a).toBe(rootInjector.get(A))
  })

  test('多例，查找最近的', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [A])
    const injector = new ReflectiveInjector(rootInjector, [A, B])
    expect(injector.get(B).a instanceof A).toBeTruthy()
    expect(injector.get(A) instanceof A).toBeTruthy()

    expect(rootInjector.get(A) instanceof A).toBeTruthy()
    expect(rootInjector.get(A) !== injector.get(A)).toBeTruthy()
  })

  test('跳过同级依赖', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@SkipSelf() public a: A) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [A])
    const injector = new ReflectiveInjector(rootInjector, [A, B])

    expect(injector.get(B).a).toBe(rootInjector.get(A))
    expect(injector.get(B).a !== injector.get(A)).toBeTruthy()
  })

  test('锁定同级依赖', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@Self() public a: A) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [A])
    const injector = new ReflectiveInjector(rootInjector, [B])

    const injector2 = new ReflectiveInjector(null, [B])

    expect(() => injector.get(B)).toThrow()
    expect(() => injector2.get(B)).toThrow()
  })

  test('可选同级依赖', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@Optional() @Self() public a: A) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [A])
    const injector = new ReflectiveInjector(rootInjector, [B])

    const injector2 = new ReflectiveInjector(null, [B])

    expect(injector.get(B).a).toBeNull()
    expect(injector2.get(B).a).toBeNull()
  })

  test('可选父级依赖', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@Optional() @SkipSelf() public a: A) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [A])
    const injector = new ReflectiveInjector(rootInjector, [B])

    const injector2 = new ReflectiveInjector(null, [B])

    expect(injector.get(B).a instanceof A).toBeTruthy()
    expect(injector2.get(B).a).toBeNull()
  })

  test('正常调用 null 注入器', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const injector = new ReflectiveInjector(new NullInjector(), [B])

    const fn = jest.spyOn(injector.parentInjector!, 'get')

    expect(injector.parentInjector instanceof NullInjector).toBeTruthy()
    expect(() => injector.get(B)).toThrow()
    expect(fn).toBeCalled()
  })

  test('抽象类继承', () => {
    abstract class Test {
      abstract get(): string

      abstract show(): boolean
    }

    @Injectable()
    class Child extends Test {
      get(): string {
        return ''
      }

      show(): boolean {
        return false
      }
    }

    const parentInjector = new ReflectiveInjector(null, [{
      provide: Test,
      useClass: Child
    }])

    const injector = new ReflectiveInjector(parentInjector, [])

    const instance = injector.get(Test as Type<Test>)

    expect(instance).toBeInstanceOf(Child)
  })

  test('class 指定依赖', () => {
    @Injectable()
    class A {
      name = 'a'
    }

    @Injectable()
    class B {
      name = 'b'
    }

    @Injectable()
    class C {
      constructor(public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [A, B, {
      provide: C,
      useClass: C,
      deps: [B]
    }])

    expect(injector.get(C).a.name).toBe('b')
  })

  test('未装饰类不能注入', () => {
    @Injectable()
    class A {
      name = 'a'
    }

    @Injectable()
    class B {
      name = 'b'
    }

    class C {
      constructor(public a: A) {
      }
    }

    expect(() => {
      new ReflectiveInjector(null, [A, B, C])
    }).toThrow()
  })

  test('指定不存在的注入 token 抛出异常', () => {
    @Injectable()
    class A {
      name = 'a'
    }

    @Injectable()
    class B {
      name = 'b'
    }

    @Injectable()
    class C {
      constructor(public a: A) {
      }
    }

    expect(() => {
      new ReflectiveInjector(null, [A, B, {
        provide: C,
        useClass: C,
        deps: [[new Self(), undefined]]
      }])
    }).toThrow()
  })

  test('可选依赖返回值测试', () => {
    @Injectable()
    class A {
      name = 'a'
    }

    @Injectable()
    class B {
      name = 'b'
    }

    @Injectable()
    class C {
      constructor(public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [{
      provide: C,
      useClass: C,
      deps: [[B, new Optional()]]
    }])

    expect(injector.get(C).a).toBe(null)
  })
})

describe('装饰分支测试', () => {
  test('跳过自身，查不到抛出异常', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@SkipSelf() public a: A) {
      }
    }

    const injector = new ReflectiveInjector(null, [B])

    expect(() => {
      injector.get(B)
    }).toThrow()
  })

  test('跳过自身，查不到抛出异常', () => {
    @Injectable()
    class A {
    }

    const injector = new ReflectiveInjector(null, [A])

    expect(() => {
      injector.get(A, InjectFlags.SkipSelf, THROW_IF_NOT_FOUND)
    }).toThrow()
  })

  test('跳过自身，查不到返回默认值', () => {
    @Injectable()
    class A {
    }

    const injector = new ReflectiveInjector(null, [A])
    const obj = {}
    expect(injector.get(A, InjectFlags.SkipSelf, obj)).toStrictEqual(obj)
  })

  test('绑定自身，查不到返回默认值', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const parentInjector = new ReflectiveInjector(null, [A])

    const injector = new ReflectiveInjector(parentInjector, [B])
    const obj = {}
    expect(injector.get(A, InjectFlags.Self, obj)).toStrictEqual(obj)
  })

  test('绑定自身，查不到抛出异常', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    const parentInjector = new ReflectiveInjector(null, [A])

    const injector = new ReflectiveInjector(parentInjector, [B])
    expect(() => {
      injector.get(A, InjectFlags.Self, THROW_IF_NOT_FOUND)
    }).toThrow()
  })

  test('父级可选查找', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(@Optional() public a: A) {
      }
    }

    const ppInjector = new ReflectiveInjector(null, [])
    const parentInjector = new ReflectiveInjector(ppInjector, [B])
    const injector = new ReflectiveInjector(parentInjector, [])

    expect(injector.get(B, InjectFlags.Optional, null as any).a).toBeNull()
  })
})

describe('动态缓存测试', () => {
  test('父级相关依赖直接使用缓存', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    @Injectable()
    class C {
      constructor(public b: B, public a: A) {
      }
    }

    const parentInjector = new ReflectiveInjector(null, [A, B])

    const injector = new ReflectiveInjector(parentInjector, [C])
    expect(injector.get(C).a).toStrictEqual(injector.get(C).b.a)
  })

  test('使用在解决依赖过程中创建的实例', () => {
    @Injectable()
    class A {
    }

    @Injectable()
    class B {
      constructor(public a: A) {
      }
    }

    @Injectable()
    class C {
      @Prop(forwardRef(() => D))
      d!: any // Cannot access 'D' before initialization
      constructor(public b: B, public a: A) {
      }
    }

    @Injectable()
    class D {
      constructor(public c: C) {
      }
    }

    const parentInjector = new ReflectiveInjector(null, [A, B])

    const injector = new ReflectiveInjector(parentInjector, [C, D])
    expect(injector.get(D).c.d).toBeInstanceOf(D)
  })
})

describe('ReflectiveInjector Scope 注入', () => {
  test('正确获取到实例', () => {
    const scope = new Scope('scope')
    const rootInjector = new ReflectiveInjector(null, [], scope)

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const injector = new ReflectiveInjector(rootInjector, [])

    const testInstance = injector.get(Test)

    expect(testInstance).toBeInstanceOf(Test)
  })
  test('确保重复获取实例均为同一实例', () => {
    const scope = new Scope('scope')
    const rootInjector = new ReflectiveInjector(null, [], scope)

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const injector = new ReflectiveInjector(rootInjector, [])

    const testInstance = injector.get(Test)
    const testInstance2 = injector.get(Test)

    expect(testInstance).toBe(testInstance2)
  })
  test('确保 provide 挂载到正确位置', () => {
    const scope = new Scope('scope')
    const rootInjector = new ReflectiveInjector(null, [])

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const scopeInjector = new ReflectiveInjector(rootInjector, [], scope)

    const injector = new ReflectiveInjector(scopeInjector, [])

    injector.get(Test)
    expect((scopeInjector as any).normalizedProviders[0].provide).toBe(Test)
    expect((rootInjector as any).normalizedProviders).toEqual([])
    expect((injector as any).normalizedProviders).toEqual([])
  })
  test('确保多个 injector 获取不会重复注册', () => {
    const scope = new Scope('scope')
    const rootInjector = new ReflectiveInjector(null, [])

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const scopeInjector = new ReflectiveInjector(rootInjector, [], scope)

    const injector = new ReflectiveInjector(scopeInjector, [])
    const injector2 = new ReflectiveInjector(scopeInjector, [])

    injector.get(Test)
    injector2.get(Test)
    expect((scopeInjector as any).normalizedProviders.length).toBe(1)
    expect((scopeInjector as any).normalizedProviders[0].provide).toBe(Test)
  })
  test('确保多个 injector 获取实例相同', () => {
    const scope = new Scope('scope')
    const rootInjector = new ReflectiveInjector(null, [])

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const scopeInjector = new ReflectiveInjector(rootInjector, [], scope)

    const injector = new ReflectiveInjector(scopeInjector, [])
    const injector2 = new ReflectiveInjector(scopeInjector, [])

    const instance1 = injector.get(Test)
    const instance2 = injector2.get(Test)
    expect(instance1).toBe(instance2)
  })
  test('确保 scope 声明时也注册到正确位置', () => {
    const scope = new Scope('scope')
    const rootInjector = new ReflectiveInjector(null, [])

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const scopeInjector = new ReflectiveInjector(rootInjector, [], scope)

    const injector = new ReflectiveInjector(scopeInjector, [Test])

    scopeInjector.get(Test)
    injector.get(Test)

    expect((injector as any).normalizedProviders.length).toBe(1)
    expect((scopeInjector as any).normalizedProviders.length).toBe(1)
  })
  test('确保 scope 声明就近查的原则', () => {
    const scope = new Scope('scope')
    const rootInjector = new ReflectiveInjector(null, [])

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const scopeInjector = new ReflectiveInjector(rootInjector, [], scope)

    const injector = new ReflectiveInjector(scopeInjector, [Test])

    const instance1 = scopeInjector.get(Test)
    const instance2 = injector.get(Test)
    expect(instance1).toBeInstanceOf(Test)
    expect(instance2).toBeInstanceOf(Test)
    expect(instance1).not.toBe(instance2)
  })
  test('确保 scope 查找不会到 scope 之上', () => {
    const scope = new Scope('scope')

    const fn = jest.fn()

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const rootInjector = new ReflectiveInjector(null, [{
      provide: Test,
      useFactory() {
        fn()
        return new Test()
      }
    }])
    const scopeInjector = new ReflectiveInjector(rootInjector, [], scope)

    const injector = new ReflectiveInjector(scopeInjector, [])

    injector.get(Test)

    expect((scopeInjector as any).normalizedProviders.length).toBe(1)
    expect(fn).not.toBeCalled()
  })
  test('scope 支持可选查询', () => {
    const scope = new Scope('scope')

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    @Injectable()
    class Test2 {
      constructor(@Optional() public test: Test) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [])
    const scopeInjector = new ReflectiveInjector(rootInjector, [Test2])

    const injector = new ReflectiveInjector(scopeInjector, [])

    const test2Instance = injector.get(Test2)

    expect(test2Instance.test).toBeNull()
  })
  test('scope 支持可选查询2', () => {

    const scope = new Scope('scope')

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const injector = new ReflectiveInjector(null, [])

    const instance = injector.get(Test, InjectFlags.Default, null)
    expect(instance).toBeNull()
  })
  test('抛出找不到 scope 异常', () => {
    const scope = new Scope('test')

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const injector = new ReflectiveInjector(null, [])

    expect(() => {
      injector.get(Test)
    }).toThrow('Can not found provide scope `test`!')
  })

  test('抛出找不到匿名 scope 异常', () => {
    const scope = new Scope('')

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    const injector = new ReflectiveInjector(null, [])

    expect(() => {
      injector.get(Test)
    }).toThrow('Can not found provide scope `[anonymous provide scope]`!')
  })

  test('在查询链上找不到 scope 抛出异常', () => {
    const scope = new Scope('test')

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    @Injectable()
    class Test2 {
      constructor(public test: Test) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [])
    const injector = new ReflectiveInjector(rootInjector, [Test2])

    expect(() => {
      injector.get(Test2)
    }).toThrow('No provide for `Test`!')
  })

  test('在查询链上找不到匿名 scope 抛出异常', () => {
    const scope = new Scope('test')

    @Injectable({
      provideIn: scope
    })
    class Test {
      name = 'test'
    }

    @Injectable()
    class Test2 {
      constructor(public test: Test) {
      }
    }

    const rootInjector = new ReflectiveInjector(null, [])
    const injector = new ReflectiveInjector(rootInjector, [Test2])

    expect(() => {
      injector.get(Test2)
    }).toThrow('No provide for `Test`!')
  })

  test('可选注入不存在时，注入 null', () => {

    @Injectable()
    class Test0 {
      name = 'test0'
    }

    @Injectable()
    class Test1 {
      constructor(@Optional() public test0: Test0) {
      }
    }

    @Injectable()
    class Test2 {
      constructor(public child: Test1) {
      }
    }

    const injector = new ReflectiveInjector(null, [Test1, Test2])
    const test2 = injector.get(Test2)
    expect(test2.child.test0).toBeNull()
  })
})

describe('元数据冲突', () => {
  test('子类继承无法改变父类元数据', () => {
    @Injectable()
    class Root {
    }

    @Injectable()
    class User {
    }

    @Injectable({
      provideIn: 'root'
    })
    class Parent {
      constructor(public root: Root) {
      }

      show() {
        console.log('parent')
      }
    }

    @Injectable()
    class Child extends Parent {
      constructor(public user: User, public override root: Root) {
        super(root)
      }

      log() {
        console.log('log')
      }
    }

    const injector = new ReflectiveInjector(null as any, [Root])

    expect(injector.get(Parent)).toBeInstanceOf(Parent)

    const injector2 = new ReflectiveInjector(null as any, [Child, User, Root])

    expect(injector2.get(Child)).toBeInstanceOf(Child)

    const injector3 = new ReflectiveInjector(null as any, [User, Root, {
      provide: Parent,
      useClass: Child
    }])

    expect(injector3.get(Parent)).toBeInstanceOf(Child)
  })

  /**
   * 因装饰器调用规则，先声明的装饰器，会后执行
   */
  test('相同参数装饰器，先声明的生效', () => {
    @Injectable()
    class A {
      name = 'a'
    }

    @Injectable()
    class B {
      name = 'b'
    }

    @Injectable()
    class Main {
      constructor(@Inject(A) @Inject(B) public child: B) {
      }
    }

    const injector = new ReflectiveInjector(null, [A, B, Main])
    expect(injector.get(Main).child.name).toBe('a')
    expect(injector.get(Main).child).toBeInstanceOf(A)
  })
})

describe('InjectionToken', () => {
  test('可提供并注入 token', () => {
    const token = new InjectionToken<null>('xxxx')
    const injector = new ReflectiveInjector(null, [{
      provide: token,
      useValue: null
    }])

    expect(injector.get(token)).toBeNull()
  })
})
