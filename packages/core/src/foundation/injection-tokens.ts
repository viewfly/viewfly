import { ElementNamespace } from './_utils'

export type NativeNode = Record<string, any>

export abstract class NativeRenderer<ElementNode = NativeNode, TextNode = NativeNode> {
  abstract createElement(name: string, namespace: ElementNamespace): ElementNode

  abstract createTextNode(textContent: string, namespace: ElementNamespace): TextNode

  abstract setProperty(node: ElementNode, key: string, value: any, namespace: ElementNamespace): void

  abstract appendChild(parent: ElementNode, newChild: ElementNode | TextNode, namespace: ElementNamespace): void

  abstract prependChild(parent: ElementNode, newChild: ElementNode | TextNode, namespace: ElementNamespace): void

  abstract removeProperty(node: ElementNode, key: string, namespace: ElementNamespace): void

  abstract setStyle(target: ElementNode, key: string, value: any, namespace: ElementNamespace): void

  abstract removeStyle(target: ElementNode, key: string, namespace: ElementNamespace): void

  abstract setClass(target: ElementNode, value: string, namespace: ElementNamespace): void

  abstract listen<T = any>(node: ElementNode, type: string, callback: (ev: T) => any, namespace: ElementNamespace): void

  abstract unListen(node: ElementNode, type: string, callback: (ev: any) => any, namespace: ElementNamespace): void

  abstract remove(node: ElementNode | TextNode, namespace: ElementNamespace): void

  abstract cleanChildren(node: ElementNode, namespace: ElementNamespace): void

  abstract syncTextContent(target: TextNode, content: string, namespace: ElementNamespace): void

  abstract insertAfter(newNode: ElementNode | TextNode, ref: ElementNode | TextNode, namespace: ElementNamespace): void
}
