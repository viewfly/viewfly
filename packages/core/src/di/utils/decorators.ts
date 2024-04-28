import {
  Annotations,
  PropertyDecoratorContextCallback
} from './annotations'

/**
 * 创建参数装饰器的工厂函数
 */
export function makeParamDecorator(token: any, metadata: any): ParameterDecorator {
  return function (target, propertyKey, parameterIndex) {
    const annotations = getAnnotations(target)
    annotations.pushParamMetadata(token, {
      propertyKey: propertyKey!,
      parameterIndex,
      metadata
    })
  }
}

/**
 * 创建属性装饰器的工厂函数
 */
export function makePropertyDecorator(token: any, injectToken: any, contextCallback: PropertyDecoratorContextCallback): PropertyDecorator {
  return function (target, propertyKey) {
    const annotations = getAnnotations(target.constructor)
    annotations.pushPropMetadata(token, {
      injectToken: injectToken || Reflect.getMetadata('design:type', target, propertyKey),
      propertyKey,
      contextCallback
    })
  }
}

/**
 * 创建类装饰器的工厂函数
 */
export function makeClassDecorator(token: any, metadata: any): ClassDecorator {
  return function (target) {
    const annotations = getAnnotations(target)
    annotations.setClassMetadata(token, {
      paramTypes: Reflect.getMetadata('design:paramtypes', target),
      metadata
    })
  }
}

/**
 * 获取类注解的工具函数
 */
export function getAnnotations(target: any): Annotations {
  const key = '__annotations__'
  // eslint-disable-next-line no-prototype-builtins
  if (!target.hasOwnProperty(key)) {
    target[key] = new Annotations()
  }
  return target[key] as Annotations
}
