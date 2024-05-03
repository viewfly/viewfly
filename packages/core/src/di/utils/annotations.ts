import { Injector } from '../injector'

export interface ClassAnnotation {
  paramTypes: any[]
  metadata: any
}


export interface ParamAnnotation {
  propertyKey: string | symbol
  parameterIndex: number
  metadata: any
}

export interface PropertyDecoratorContextCallback {
  (instance: any, propertyName: string | symbol, token: any, injector: Injector): void
}

export interface PropertyAnnotation {
  injectToken: any
  propertyKey: string | symbol
  contextCallback: PropertyDecoratorContextCallback
}

/**
 * 用于保存 class 的元数据
 */
export class Annotations {
  private classes = new Map<any, ClassAnnotation>()
  private props = new Map<any, PropertyAnnotation[]>()
  private params = new Map<any, ParamAnnotation[]>()

  setClassMetadata(token: any, params: ClassAnnotation) {
    this.classes.set(token, params)
  }

  getClassMetadata(token: any) {
    return this.classes.get(token)
  }

  pushParamMetadata(token: any, params: ParamAnnotation) {
    if (this.params.has(token)) {
      this.params.get(token)!.push(params)
    } else {
      this.params.set(token, [params])
    }
  }

  getParamMetadata(token: any) {
    return this.params.get(token)
  }

  getPropMetadataKeys() {
    return Array.from(this.props.keys())
  }

  pushPropMetadata(token: any, params: PropertyAnnotation) {
    if (this.props.has(token)) {
      this.props.get(token)!.push(params)
    } else {
      this.props.set(token, [params])
    }
  }

  getPropMetadata(token: any) {
    return this.props.get(token)
  }
}
